
import { User, Group, GroupMember, Event, EventInvite, DBState, PaymentStatus, SMSLog, EventReport, SimulatedEmail } from '../types';

const DB_KEY = 'autolink_db';

const initialState: DBState = {
  users: [],
  groups: [],
  members: [],
  events: [],
  invites: [],
  smsLogs: [],
  simulatedEmails: []
};

export const getDB = (): DBState => {
  const data = localStorage.getItem(DB_KEY);
  return data ? JSON.parse(data) : initialState;
};

export const saveDB = (state: DBState) => {
  localStorage.setItem(DB_KEY, JSON.stringify(state));
};

const sendSimulatedEmail = (to: string, subject: string, body: string) => {
  const db = getDB();
  const email: SimulatedEmail = {
    id: crypto.randomUUID(),
    to,
    subject,
    body,
    timestamp: new Date().toISOString(),
    read: false
  };
  db.simulatedEmails = [email, ...db.simulatedEmails];
  saveDB(db);
  // Dispatch a custom event to notify components
  window.dispatchEvent(new CustomEvent('new-simulated-email', { detail: email }));
};

export const findUserByPhone = (phone: string) => {
  return getDB().users.find(u => u.phone === phone);
};

export const findUserByUsername = (username: string) => {
  return getDB().users.find(u => u.username === username);
};

export const registerUser = (user: Omit<User, 'id' | 'createdAt' | 'isVerified' | 'verificationCode'>): User => {
  const db = getDB();
  const isGmail = user.email.toLowerCase().endsWith('@gmail.com');
  if (isGmail) {
    const existingGmailUser = db.users.find(u => 
      u.phone === user.phone && u.email.toLowerCase().endsWith('@gmail.com')
    );
    if (existingGmailUser) {
      throw new Error("This phone number already has a linked Gmail account.");
    }
  }

  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const newUser: User = {
    ...user,
    id: crypto.randomUUID(),
    isVerified: false,
    verificationCode,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  saveDB(db);
  
  sendSimulatedEmail(
    user.email,
    "Verify your Auto-Link Account",
    `Hello ${user.fullName},<br/><br/>Welcome to Auto-Link! Your verification code is: <h2 style="color:#059669">${verificationCode}</h2><br/>Please enter this code in the app to activate your account.`
  );
  
  return newUser;
};

export const verifyUserEmail = (userId: string, code: string): User => {
  const db = getDB();
  const userIndex = db.users.findIndex(u => u.id === userId);
  if (userIndex === -1) throw new Error("User not found.");
  const user = db.users[userIndex];
  if (user.verificationCode !== code) throw new Error("Invalid verification code.");
  user.isVerified = true;
  delete user.verificationCode;
  db.users[userIndex] = user;
  saveDB(db);
  return user;
};

export const createGroup = (group: Omit<Group, 'id' | 'uniqueId' | 'createdAt'>): Group => {
  const db = getDB();
  const newGroup: Group = {
    ...group,
    id: crypto.randomUUID(),
    uniqueId: `AL-${Math.floor(1000 + Math.random() * 9000)}`,
    createdAt: new Date().toISOString()
  };
  db.groups.push(newGroup);
  db.members.push({
    groupId: newGroup.id,
    userId: group.createdBy,
    role: 'admin',
    joinedAt: new Date().toISOString()
  });
  saveDB(db);
  return newGroup;
};

export const joinGroup = (userId: string, groupUsername: string) => {
  const db = getDB();
  const group = db.groups.find(g => g.username === groupUsername);
  if (!group) throw new Error("Group not found");
  const alreadyMember = db.members.some(m => m.groupId === group.id && m.userId === userId);
  if (alreadyMember) return group;
  db.members.push({
    groupId: group.id,
    userId: userId,
    role: 'member',
    joinedAt: new Date().toISOString()
  });
  saveDB(db);
  return group;
};

export const createInviteEvent = (
  initiatorId: string, 
  groupId: string, 
  invitedUserIds: string[], 
  amount: number, 
  hcode: string,
  title: string,
  meetingDateTime: string
) => {
  const db = getDB();
  const newEvent: Event = {
    id: crypto.randomUUID(),
    groupId,
    createdBy: initiatorId,
    amountPerMember: amount,
    meetingHcode: hcode,
    meetingDateTime,
    title,
    status: 'active',
    createdAt: new Date().toISOString()
  };
  db.events.push(newEvent);
  
  const group = db.groups.find(g => g.id === groupId);

  const newInvites: EventInvite[] = invitedUserIds.map(uid => {
    const invitedUser = db.users.find(u => u.id === uid);
    if (invitedUser) {
      sendSimulatedEmail(
        invitedUser.email,
        `New Meetup Invite: ${title}`,
        `You have been invited to <b>${title}</b> by the ${group?.name} group.<br/><br/>Amount: KES ${amount}<br/>Location: ${hcode}<br/>Time: ${new Date(meetingDateTime).toLocaleString()}`
      );
    }
    return {
      id: crypto.randomUUID(),
      eventId: newEvent.id,
      invitedUserId: uid,
      emailSent: true,
      paymentStatus: PaymentStatus.PENDING,
      paidAmount: 0,
      smsSent: false
    };
  });
  
  db.invites.push(...newInvites);
  saveDB(db);
  return newEvent;
};

export const closeEvent = (eventId: string, initiatorId: string, report: EventReport) => {
  const db = getDB();
  const eventIndex = db.events.findIndex(e => e.id === eventId);
  if (eventIndex === -1) throw new Error("Event not found");
  const event = db.events[eventIndex];
  if (event.createdBy !== initiatorId) throw new Error("Only initiator can close meeting");
  if (event.status === 'closed') throw new Error("Meeting already closed");

  const now = new Date();
  const startTime = new Date(event.meetingDateTime);
  const diffMs = now.getTime() - startTime.getTime();
  const durationMinutes = Math.max(0, Math.floor(diffMs / 60000));

  event.status = 'closed';
  event.endTime = now.toISOString();
  event.durationMinutes = durationMinutes;
  event.report = report;

  db.events[eventIndex] = event;

  // Simulation: Email Absentees
  if (report.absentUserIds.length > 0) {
    report.absentUserIds.forEach(uid => {
      const user = db.users.find(u => u.id === uid);
      if (user) {
        sendSimulatedEmail(
          user.email,
          "You missed the spot!",
          `Hello ${user.fullName},<br/><br/>You missed the <b>${event.title}</b> meeting today. We missed you!<br/><br/>Summary of what happened:<br/>Duration: ${durationMinutes} mins<br/>Goods missed: ${JSON.stringify(report.goodsCounts)}`
        );
      }
    });
  }

  // Simulation: Email AOPs
  if (report.aops.length > 0) {
    const group = db.groups.find(g => g.id === event.groupId);
    report.aops.forEach(aop => {
      sendSimulatedEmail(
        aop.email,
        "You were invited as an AOP!",
        `Hello ${aop.name},<br/><br/>You were tagged as a partner (AOP) at the <b>${event.title}</b> meeting.<br/><br/>Join Auto-Link to be part of the community and join group <b>@${group?.username}</b> using this link:<br/>${window.location.origin}${window.location.pathname}#/join/@${group?.username}`
      );
    });
  }

  saveDB(db);
  return event;
};

export const simulatePayment = (inviteId: string) => {
  const db = getDB();
  const invite = db.invites.find(i => i.id === inviteId);
  const event = db.events.find(e => e.id === invite?.eventId);
  if (invite && event) {
    invite.paymentStatus = PaymentStatus.PAID;
    invite.paidAmount = event.amountPerMember;
    invite.paidAt = new Date().toISOString();
    saveDB(db);
  }
};

export const sendBulkSMS = (eventId: string, initiatorId: string, message: string) => {
  const db = getDB();
  const paidInvites = db.invites.filter(i => i.eventId === eventId && i.paymentStatus === PaymentStatus.PAID);
  if (paidInvites.length === 0) throw new Error("No paid members to send SMS to.");
  paidInvites.forEach(i => i.smsSent = true);
  const log: SMSLog = {
    id: crypto.randomUUID(),
    eventId,
    sentBy: initiatorId,
    message,
    totalSent: paidInvites.length,
    createdAt: new Date().toISOString()
  };
  db.smsLogs.push(log);
  saveDB(db);
  return log;
};

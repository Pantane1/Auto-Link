
export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED'
}

export interface User {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  hcode: string;
  profilePicUrl?: string;
  isVerified: boolean;
  verificationCode?: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  username: string;
  uniqueId: string;
  hcode: string;
  createdBy: string;
  createdAt: string;
}

export interface GroupMember {
  groupId: string;
  userId: string;
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface AOP {
  name: string;
  email: string;
}

export interface SimulatedEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
  read: boolean;
}

export interface EventReport {
  allPresent: boolean;
  absentUserIds: string[];
  goodsCounts: Record<string, number>;
  aops: AOP[];
}

export interface Event {
  id: string;
  groupId: string;
  createdBy: string;
  meetingHcode: string;
  meetingDateTime: string;
  endTime?: string;
  durationMinutes?: number;
  amountPerMember: number;
  status: 'active' | 'closed';
  title: string;
  createdAt: string;
  report?: EventReport;
}

export interface EventInvite {
  id: string;
  eventId: string;
  invitedUserId: string;
  emailSent: boolean;
  paymentStatus: PaymentStatus;
  mpesaCheckoutId?: string;
  paidAmount: number;
  paidAt?: string;
  smsSent: boolean;
}

export interface SMSLog {
  id: string;
  eventId: string;
  sentBy: string;
  message: string;
  totalSent: number;
  createdAt: string;
}

export interface DBState {
  users: User[];
  groups: Group[];
  members: GroupMember[];
  events: Event[];
  invites: EventInvite[];
  smsLogs: SMSLog[];
  simulatedEmails: SimulatedEmail[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

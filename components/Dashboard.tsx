
import React, { useState, useEffect } from 'react';
import { User, Group, Event, DBState } from '../types';
import { getDB, createGroup } from '../services/db';

interface DashboardProps {
  user: User;
  onGroupSelect: (id: string) => void;
  onEventSelect: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onGroupSelect, onEventSelect }) => {
  const [db, setDb] = useState<DBState>(getDB());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', username: '', hcode: '' });

  const myMemberRecords = db.members.filter(m => m.userId === user.id);
  const myGroups = db.groups.filter(g => myMemberRecords.some(m => m.groupId === g.id));
  const myInitiatedEvents = db.events.filter(e => e.createdBy === user.id);
  const myInvites = db.invites.filter(i => i.invitedUserId === user.id);

  // Performance Stats
  const attendedCount = db.events.filter(e => 
    e.status === 'closed' && 
    db.invites.some(i => i.eventId === e.id && i.invitedUserId === user.id && i.paymentStatus === 'PAID') &&
    !(e.report?.absentUserIds.includes(user.id))
  ).length;

  const missedCount = db.events.filter(e => 
    e.status === 'closed' && 
    (
      (db.invites.some(i => i.eventId === e.id && i.invitedUserId === user.id && i.paymentStatus === 'PAID') && e.report?.absentUserIds.includes(user.id)) ||
      (db.invites.some(i => i.eventId === e.id && i.invitedUserId === user.id && i.paymentStatus === 'PENDING'))
    )
  ).length;

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    createGroup({
      name: newGroup.name,
      username: newGroup.username,
      hcode: newGroup.hcode,
      createdBy: user.id
    });
    setDb(getDB());
    setShowCreateModal(false);
    setNewGroup({ name: '', username: '', hcode: '' });
  };

  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-KE', {
      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">Meetings Attended</p>
          <p className="text-3xl font-bold text-emerald-600">{attendedCount}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">Meetings Missed</p>
          <p className="text-3xl font-bold text-red-600">{missedCount}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">Groups</p>
          <p className="text-3xl font-bold text-blue-600">{myGroups.length}</p>
        </div>
        <div className="bg-emerald-700 p-6 rounded-xl shadow-lg text-white">
          <p className="text-emerald-100 text-[10px] font-bold uppercase mb-1">My Hcode</p>
          <p className="text-xl font-bold">{user.hcode}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-800">My Groups</h2>
            <button onClick={() => setShowCreateModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all">+ New Group</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myGroups.map(g => (
              <div 
                key={g.id} 
                className="bg-white p-5 rounded-xl border border-slate-200 hover:border-emerald-500 transition-all cursor-pointer group shadow-sm"
                onClick={() => onGroupSelect(g.id)}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center font-bold">{g.name[0]}</div>
                  <div>
                    <h3 className="font-bold text-slate-800">{g.name}</h3>
                    <p className="text-[10px] text-slate-400 font-mono">@{g.username}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                  <span>Hcode: <span className="text-emerald-600 font-mono">{g.hcode}</span></span>
                  <span className="group-hover:text-emerald-600">Enter Group →</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800">Recent Invites</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            {myInvites.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm italic">No invites found.</div>
            ) : (
              myInvites.sort((a,b) => b.id.localeCompare(a.id)).map(invite => {
                const event = db.events.find(e => e.id === invite.eventId);
                const inviter = db.users.find(u => u.id === event?.createdBy);
                if (event?.status === 'closed') return null;
                return (
                  <div 
                    key={invite.id} 
                    className="p-4 border-b last:border-0 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => onEventSelect(invite.eventId)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-bold text-slate-800 truncate text-sm">{event?.title}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        invite.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>{invite.paymentStatus}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mb-2">From: {inviter?.fullName}</p>
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-bold text-emerald-600">KES {event?.amountPerMember}</p>
                      {event?.meetingDateTime && <p className="text-[10px] text-slate-400">{formatDateTime(event.meetingDateTime)}</p>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-bold mb-6 text-slate-800">Create New Group</h3>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Group Name</label>
                <input required className="w-full px-4 py-2 border rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none" value={newGroup.name} onChange={e => setNewGroup({...newGroup, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Handle (@username)</label>
                <input required className="w-full px-4 py-2 border rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none" value={newGroup.username} onChange={e => setNewGroup({...newGroup, username: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Group Location Hcode</label>
                <input required className="w-full px-4 py-2 border rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none" value={newGroup.hcode} onChange={e => setNewGroup({...newGroup, hcode: e.target.value})} />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2 text-sm font-bold border rounded-lg hover:bg-slate-50">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-lg shadow-emerald-100">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

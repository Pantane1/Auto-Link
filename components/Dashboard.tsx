
import React, { useState, useEffect } from 'react';
import { User, Group, Event, DBState } from '../types';
import { getDB, createGroup, SEED_USER_ID } from '../services/db';

interface DashboardProps {
  user: User;
  onGroupSelect: (id: string) => void;
  onEventSelect: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onGroupSelect, onEventSelect }) => {
  const [db, setDb] = useState<DBState>(getDB());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', username: '', hcode: '' });
  const [activeTab, setActiveTab] = useState<'my' | 'discover'>('my');

  const myMemberRecords = db.members.filter(m => m.userId === user.id);
  const myGroups = db.groups.filter(g => myMemberRecords.some(m => m.groupId === g.id));
  const publicGroups = db.groups.filter(g => !myMemberRecords.some(m => m.groupId === g.id));
  const myInvites = db.invites.filter(i => i.invitedUserId === user.id);
  const otherUsers = db.users.filter(u => u.id !== user.id);

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
          <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">My Groups</p>
          <p className="text-3xl font-bold text-blue-600">{myGroups.length}</p>
        </div>
        <div className="bg-emerald-700 p-6 rounded-xl shadow-lg text-white">
          <p className="text-emerald-100 text-[10px] font-bold uppercase mb-1">My Personal ID</p>
          <p className="text-xl font-bold font-mono">{user.hcode}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex bg-slate-200/50 p-1 rounded-xl">
              <button 
                onClick={() => setActiveTab('my')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'my' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
              >
                My Groups
              </button>
              <button 
                onClick={() => setActiveTab('discover')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'discover' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
              >
                Discover Community
              </button>
            </div>
            {activeTab === 'my' && (
              <button onClick={() => setShowCreateModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all">+ New Group</button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeTab === 'my' ? (
              myGroups.length === 0 ? (
                <div className="col-span-2 py-12 text-center bg-white rounded-xl border border-dashed border-slate-300">
                  <p className="text-slate-400 text-sm">You haven't joined any groups yet.</p>
                  <button onClick={() => setActiveTab('discover')} className="text-emerald-600 text-xs font-bold mt-2 hover:underline">Browse Public Groups →</button>
                </div>
              ) : (
                myGroups.map(g => (
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
                      <span>Group Location: <span className="text-emerald-600 font-mono">{g.hcode}</span></span>
                      <span className="group-hover:text-emerald-600">Enter Group →</span>
                    </div>
                  </div>
                ))
              )
            ) : (
              publicGroups.map(g => (
                <div 
                  key={g.id} 
                  className="bg-white p-5 rounded-xl border border-slate-100 hover:border-blue-500 transition-all cursor-pointer group shadow-sm flex flex-col justify-between"
                  onClick={() => onGroupSelect(g.id)}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold">{g.name[0]}</div>
                    <div>
                      <h3 className="font-bold text-slate-800">{g.name}</h3>
                      <p className="text-[10px] text-slate-400 font-mono">@{g.username}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">📍 {g.hcode}</span>
                    <span className="text-[10px] font-bold text-blue-600 uppercase group-hover:underline">Preview & Join →</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800">Community Directory</h2>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-100">
              {otherUsers.map(u => (
                <div key={u.id} className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center font-bold">
                    {u.fullName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{u.fullName} {u.id === SEED_USER_ID && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1 rounded">LEADER</span>}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{u.hcode}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <h2 className="text-xl font-bold text-slate-800">Recent Invites</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            {myInvites.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm italic">No active invites.</div>
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
          
          <div className="p-5 bg-blue-50 border border-blue-100 rounded-xl">
            <h4 className="text-sm font-bold text-blue-800 mb-1">Community Note</h4>
            <p className="text-[11px] text-blue-600 leading-relaxed">
              Auto-Link uses <b>Hcodes</b> to ensure privacy. Your personal Hcode ({user.hcode}) is your unique signature in meetings.
            </p>
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

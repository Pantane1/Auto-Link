
import React, { useState } from 'react';
import { User, Group, DBState } from '../types';
import { getDB, createInviteEvent } from '../services/db';

interface GroupViewProps {
  groupId: string;
  userId: string;
  onBack: () => void;
  onEventSelect: (id: string) => void;
}

const GroupView: React.FC<GroupViewProps> = ({ groupId, userId, onBack, onEventSelect }) => {
  const [db, setDb] = useState<DBState>(getDB());
  const group = db.groups.find(g => g.id === groupId);
  const memberRecords = db.members.filter(m => m.groupId === groupId);
  const members = db.users.filter(u => memberRecords.some(mr => mr.userId === u.id));
  
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({ title: '', amount: 0, hcode: '', dateTime: '' });

  const activeEvents = db.events.filter(e => e.groupId === groupId && e.status === 'active');
  const closedEvents = db.events.filter(e => e.groupId === groupId && e.status === 'closed');

  if (!group) return null;

  const toggleSelect = (id: string) => {
    if (id === userId) return;
    setSelectedMembers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMembers.length === 0) return;
    const newEvent = createInviteEvent(userId, groupId, selectedMembers, inviteData.amount, inviteData.hcode, inviteData.title, inviteData.dateTime);
    setDb(getDB());
    setShowInviteModal(false);
    onEventSelect(newEvent.id);
  };

  const copyLink = () => {
    const link = `${window.location.origin}${window.location.pathname}#/join/@${group.username}`;
    navigator.clipboard.writeText(link);
    alert("Join link copied!");
  };

  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-slate-500 hover:text-emerald-600 font-medium transition-colors">← Back</button>
      </div>

      <div className="bg-emerald-800 text-white p-10 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{group.name}</h1>
          <p className="text-emerald-100 font-mono mt-1 text-sm">@{group.username} • {members.length} members</p>
        </div>
        <button onClick={copyLink} className="bg-emerald-700/50 hover:bg-emerald-700 border border-emerald-500/30 px-6 py-2.5 rounded-2xl text-xs font-bold transition-all backdrop-blur-sm">Copy Join Link</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">Members & Initiation</h2>
              {selectedMembers.length > 0 && <button onClick={() => setShowInviteModal(true)} className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-bold animate-pulse shadow-lg shadow-emerald-200">Start Meetup with {selectedMembers.length} →</button>}
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
              {members.map(member => (
                <div 
                  key={member.id} 
                  onClick={() => toggleSelect(member.id)}
                  className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${selectedMembers.includes(member.id) ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400">{member.fullName[0]}</div>
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{member.fullName} {member.id === userId && <span className="text-[9px] bg-slate-200 text-slate-500 px-1 rounded ml-1">ADMIN</span>}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{member.hcode}</p>
                    </div>
                  </div>
                  {member.id !== userId && <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedMembers.includes(member.id) ? 'bg-emerald-500 border-emerald-500 text-white scale-110' : 'border-slate-200'}`}>{selectedMembers.includes(member.id) && "✓"}</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-800">Active Meetings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeEvents.length === 0 ? <div className="col-span-2 p-10 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-slate-400 text-xs">No active meetings. Start one above!</div> : activeEvents.map(e => (
                <div key={e.id} onClick={() => onEventSelect(e.id)} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-500 cursor-pointer shadow-sm group">
                  <p className="font-bold text-slate-800 truncate mb-1">{e.title}</p>
                  <p className="text-[10px] text-slate-400 mb-3">📍 {e.meetingHcode} • 📅 {formatDateTime(e.meetingDateTime)}</p>
                  <div className="flex justify-between items-center text-[10px] font-bold text-emerald-600 uppercase">
                    <span>KES {e.amountPerMember} / head</span>
                    <span className="group-hover:translate-x-1 transition-transform">Manage →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800">Closed Meetings</h2>
          <div className="space-y-3">
            {closedEvents.length === 0 ? <div className="p-10 text-center bg-white border border-slate-100 rounded-2xl text-slate-400 text-xs italic">No history yet.</div> : closedEvents.map(e => (
              <div key={e.id} onClick={() => onEventSelect(e.id)} className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 cursor-pointer hover:bg-slate-800 transition-colors shadow-md">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-bold text-sm truncate">{e.title}</p>
                  <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono">{e.durationMinutes}m</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-500">Date: {new Date(e.endTime!).toLocaleDateString()}</span>
                  <span className="text-emerald-400 font-bold">Closed ✓</span>
                </div>
                {e.report && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {/* Fixed: cast count to number to resolve unknown type error */}
                    {Object.entries(e.report.goodsCounts).map(([icon, count]) => (
                      (count as number) > 0 && <span key={icon} className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">{icon} {count as number}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white p-8 rounded-3xl w-full max-w-lg shadow-2xl">
            <h3 className="text-2xl font-bold mb-2">Initiate Meetup</h3>
            <p className="text-xs text-slate-500 mb-6">Inviting <b>{selectedMembers.length}</b> people from {group.name}.</p>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Purpose / Title</label>
                <input required placeholder="Goat eating, drinks, etc." className="w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-1 focus:ring-emerald-500" value={inviteData.title} onChange={e => setInviteData({...inviteData, title: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Meet Time</label>
                  <input required type="datetime-local" className="w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-1 focus:ring-emerald-500" value={inviteData.dateTime} onChange={e => setInviteData({...inviteData, dateTime: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">KES / Member</label>
                  <input required type="number" className="w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-1 focus:ring-emerald-500" value={inviteData.amount} onChange={e => setInviteData({...inviteData, amount: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hcode (Location)</label>
                  <input required placeholder="KYZ-44" className="w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-1 focus:ring-emerald-500" value={inviteData.hcode} onChange={e => setInviteData({...inviteData, hcode: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowInviteModal(false)} className="flex-1 py-3 text-sm font-bold border rounded-xl hover:bg-slate-50">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-xl shadow-emerald-200">Blast Invites</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupView;

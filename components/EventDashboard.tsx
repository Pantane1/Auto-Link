
import React, { useState, useEffect } from 'react';
import { User, Event, EventInvite, PaymentStatus, DBState, EventReport, AOP } from '../types';
import { getDB, simulatePayment, sendBulkSMS, closeEvent } from '../services/db';
import { GoogleGenAI } from '@google/genai';

interface EventDashboardProps {
  eventId: string;
  currentUserId: string;
  onBack: () => void;
}

const GOODS_ICONS = ["❇️", "🚬", "🍹", "🍾", "🍻"];

const EventDashboard: React.FC<EventDashboardProps> = ({ eventId, currentUserId, onBack }) => {
  const [db, setDb] = useState<DBState>(getDB());
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');
  const [isGeneratingSMS, setIsGeneratingSMS] = useState(false);

  // Closure Modal State
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [closureStep, setClosureStep] = useState(1);
  const [absentUserIds, setAbsentUserIds] = useState<string[]>([]);
  const [goodsCounts, setGoodsCounts] = useState<Record<string, number>>(
    GOODS_ICONS.reduce((acc, icon) => ({ ...acc, [icon]: 0 }), {})
  );
  const [aops, setAops] = useState<AOP[]>([]);
  const [tempAop, setTempAop] = useState<AOP>({ name: '', email: '' });

  const event = db.events.find(e => e.id === eventId);
  const invites = db.invites.filter(i => i.eventId === eventId);
  const isInitiator = event?.createdBy === currentUserId;
  const paidMembers = invites.filter(i => i.paymentStatus === PaymentStatus.PAID);

  const stats = {
    totalInvited: invites.length,
    paid: paidMembers.length,
    pending: invites.filter(i => i.paymentStatus === PaymentStatus.PENDING).length,
    failed: invites.filter(i => i.paymentStatus === PaymentStatus.FAILED).length,
    totalCollected: invites.reduce((acc, curr) => acc + curr.paidAmount, 0)
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('en-KE', {
      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const handleManualPay = (inviteId: string) => {
    simulatePayment(inviteId);
    setDb(getDB());
  };

  const handleAddAop = () => {
    if (tempAop.name && tempAop.email) {
      setAops([...aops, tempAop]);
      setTempAop({ name: '', email: '' });
    }
  };

  const handleFinishClosure = () => {
    const report: EventReport = {
      allPresent: absentUserIds.length === 0,
      absentUserIds,
      goodsCounts,
      aops
    };
    closeEvent(eventId, currentUserId, report);
    setDb(getDB());
    setShowClosureModal(false);
  };

  // Fixed: Added handleSendSMS implementation
  const handleSendSMS = () => {
    if (!smsMessage.trim()) return;
    try {
      sendBulkSMS(eventId, currentUserId, smsMessage);
      setDb(getDB());
      setShowSMSModal(false);
      setSmsMessage('');
      alert("SMS sent successfully to paid members!");
    } catch (err: any) {
      alert(err.message);
    }
  };

  const generateAISMSTemplate = async () => {
    setIsGeneratingSMS(true);
    try {
      // Fixed: Always create a new GoogleGenAI instance right before the API call.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Draft a short meeting SMS for Kenyan event: "${event?.title}" at ${formatDateTime(event?.meetingDateTime)}. Location: ${event?.meetingHcode}. Professional and inviting.`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      setSmsMessage(response.text || '');
    } catch (e) {
      setSmsMessage(`Meet for ${event?.title} at ${event?.meetingHcode}. See you there!`);
    } finally {
      setIsGeneratingSMS(false);
    }
  };

  if (!event) return null;

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      <div className="flex justify-between items-center">
        <button onClick={onBack} className="text-slate-500 hover:text-emerald-600 font-medium transition-colors">
          ← Back
        </button>
        <div className="flex gap-2">
          {isInitiator && event.status === 'active' && stats.paid > 0 && (
            <>
              <button 
                onClick={() => setShowSMSModal(true)}
                className="bg-white border border-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg hover:bg-slate-50 transition-all flex items-center gap-2"
              >
                Send SMS
              </button>
              <button 
                onClick={() => setShowClosureModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md transition-all flex items-center gap-2"
              >
                Declare Meeting Off
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
        <h1 className="text-3xl font-bold text-slate-800">{event.title}</h1>
        <div className="flex flex-wrap gap-3 mt-4">
          <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100">Location: {event.meetingHcode}</span>
          <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">📅 {formatDateTime(event.meetingDateTime)}</span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${event.status === 'active' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
            {event.status.toUpperCase()}
          </span>
        </div>
      </div>

      {event.status === 'closed' && event.report && (
        <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl space-y-6">
          <h2 className="text-xl font-bold border-b border-slate-800 pb-2">Meeting Closure Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-slate-400 text-xs uppercase font-bold mb-1">Time Stats</p>
              <p className="text-sm">End: {formatDateTime(event.endTime)}</p>
              <p className="text-lg font-bold text-emerald-400">Duration: {event.durationMinutes} mins</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase font-bold mb-1">Attendance</p>
              <p className="text-sm">{event.report.allPresent ? "Everyone attended!" : `${event.report.absentUserIds.length} members missed.`}</p>
              {event.report.aops.length > 0 && <p className="text-xs text-blue-400">{event.report.aops.length} AOPs joined.</p>}
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase font-bold mb-1">Goods Consumed</p>
              <div className="flex gap-3 text-xl">
                {/* Fixed: cast count to number to resolve unknown type error */}
                {Object.entries(event.report.goodsCounts).map(([icon, count]) => (
                  (count as number) > 0 && <span key={icon} title={`${count as number} units`}>{icon}<sub className="text-[10px] ml-0.5">{count as number}</sub></span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Invited</p>
          <p className="text-xl font-bold">{stats.totalInvited}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-emerald-100 text-center">
          <p className="text-[10px] font-bold text-emerald-400 uppercase">Paid</p>
          <p className="text-xl font-bold text-emerald-600">{stats.paid}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-amber-100 text-center">
          <p className="text-[10px] font-bold text-amber-400 uppercase">Pending</p>
          <p className="text-xl font-bold text-amber-600">{stats.pending}</p>
        </div>
        <div className="bg-emerald-600 p-6 rounded-xl text-white text-center shadow-lg">
          <p className="text-[10px] font-bold text-emerald-100 uppercase">Total KES</p>
          <p className="text-xl font-bold">{stats.totalCollected}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
            <tr>
              <th className="px-6 py-4">Member</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invites.map(invite => {
              const member = db.users.find(u => u.id === invite.invitedUserId);
              return (
                <tr key={invite.id}>
                  <td className="px-6 py-4 font-bold">{member?.fullName}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      invite.paymentStatus === PaymentStatus.PAID ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>{invite.paymentStatus}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {invite.paymentStatus === PaymentStatus.PENDING && (
                      <button onClick={() => handleManualPay(invite.id)} className="text-emerald-600 font-bold text-xs underline">Mock Pay</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Closure Modal */}
      {showClosureModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 p-6 border-b flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">Meeting Closure</h3>
                <p className="text-xs text-slate-500">Step {closureStep} of 3</p>
              </div>
              <div className="flex gap-1">
                {[1,2,3].map(s => <div key={s} className={`h-1.5 w-8 rounded-full ${s <= closureStep ? 'bg-emerald-500' : 'bg-slate-200'}`} />)}
              </div>
            </div>

            <div className="p-8 flex-1 overflow-y-auto">
              {closureStep === 1 && (
                <div className="space-y-4">
                  <p className="font-bold text-slate-800">Who missed the meeting?</p>
                  <p className="text-xs text-slate-500">Only paid members can be marked as absent.</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {paidMembers.map(i => {
                      const m = db.users.find(u => u.id === i.invitedUserId);
                      const isAbsent = absentUserIds.includes(i.invitedUserId);
                      return (
                        <div 
                          key={i.id} 
                          onClick={() => setAbsentUserIds(prev => isAbsent ? prev.filter(x => x !== i.invitedUserId) : [...prev, i.invitedUserId])}
                          className={`flex justify-between items-center p-3 rounded-xl border cursor-pointer transition-all ${isAbsent ? 'border-red-500 bg-red-50' : 'border-slate-100 hover:bg-slate-50'}`}
                        >
                          <span className="font-medium text-sm">{m?.fullName}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isAbsent ? 'bg-red-500 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                            {isAbsent ? "ABSENT" : "PRESENT"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {closureStep === 2 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <p className="font-bold text-slate-800">Goods Consumed</p>
                    <p className="text-xs text-slate-500">Click icons to increase count</p>
                  </div>
                  <div className="grid grid-cols-5 gap-4">
                    {GOODS_ICONS.map(icon => (
                      <button 
                        key={icon} 
                        onClick={() => setGoodsCounts(prev => ({ ...prev, [icon]: prev[icon] + 1 }))}
                        className="group flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-slate-50 hover:border-emerald-500 hover:bg-emerald-50 transition-all relative"
                      >
                        <span className="text-3xl">{icon}</span>
                        {goodsCounts[icon] > 0 && (
                          <span className="absolute -top-2 -right-2 bg-emerald-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                            {goodsCounts[icon]}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="text-center">
                    <button onClick={() => setGoodsCounts(GOODS_ICONS.reduce((acc, i) => ({ ...acc, [i]: 0 }), {}))} className="text-xs text-slate-400 hover:text-red-500 font-medium">Reset counts</button>
                  </div>
                </div>
              )}

              {closureStep === 3 && (
                <div className="space-y-6">
                  <p className="font-bold text-slate-800">Any Other Partner (AOP)?</p>
                  <p className="text-xs text-slate-500">Add attendees who are not on the platform yet.</p>
                  
                  <div className="space-y-3">
                    {aops.map((aop, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-blue-50 text-blue-800 rounded-xl text-xs">
                        <span><b>{aop.name}</b> ({aop.email})</span>
                        <button onClick={() => setAops(aops.filter((_, i) => i !== idx))} className="text-red-500 font-bold">✕</button>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <input 
                      placeholder="Name" 
                      className="px-3 py-2 text-xs border rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none"
                      value={tempAop.name}
                      onChange={e => setTempAop({...tempAop, name: e.target.value})}
                    />
                    <input 
                      placeholder="Email" 
                      className="px-3 py-2 text-xs border rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none"
                      value={tempAop.email}
                      onChange={e => setTempAop({...tempAop, email: e.target.value})}
                    />
                    <button 
                      onClick={handleAddAop}
                      disabled={!tempAop.name || !tempAop.email}
                      className="col-span-2 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg disabled:opacity-50 mt-2"
                    >
                      + Add AOP
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t flex gap-4">
              {closureStep > 1 && (
                <button 
                  onClick={() => setClosureStep(closureStep - 1)}
                  className="flex-1 py-3 border rounded-xl hover:bg-white transition-colors text-sm font-bold"
                >
                  Back
                </button>
              )}
              {closureStep < 3 ? (
                <button 
                  onClick={() => setClosureStep(closureStep + 1)}
                  className="flex-1 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-colors text-sm font-bold"
                >
                  Next Step
                </button>
              ) : (
                <button 
                  onClick={handleFinishClosure}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm font-bold shadow-lg shadow-emerald-200"
                >
                  Finish & Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SMS Modal */}
      {showSMSModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Draft Bulk SMS</h3>
            <div className="space-y-4">
              <button 
                onClick={generateAISMSTemplate}
                className="w-full text-xs font-bold py-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 disabled:opacity-50"
                disabled={isGeneratingSMS}
              >
                {isGeneratingSMS ? '✨ Gemini thinking...' : '✨ Generate AI Message'}
              </button>
              <textarea 
                className="w-full h-32 px-4 py-2 border rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                value={smsMessage}
                onChange={e => setSmsMessage(e.target.value)}
              />
              <div className="flex gap-4">
                <button onClick={() => setShowSMSModal(false)} className="flex-1 py-2 text-sm font-bold border rounded-lg">Cancel</button>
                <button 
                  onClick={handleSendSMS}
                  disabled={!smsMessage.trim()}
                  className="flex-1 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg shadow-lg disabled:opacity-50"
                >
                  Send to {stats.paid} Paid
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDashboard;

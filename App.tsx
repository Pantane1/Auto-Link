
import React, { useState, useEffect } from 'react';
import { User, SimulatedEmail, Group } from './types.ts';
import { getDB } from './services/db.ts';
import AuthView from './components/Auth.tsx';
import Dashboard from './components/Dashboard.tsx';
import GroupView from './components/GroupView.tsx';
import EventDashboard from './components/EventDashboard.tsx';
import AIAssistant from './components/AIAssistant.tsx';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'group' | 'event'>('dashboard');
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<SimulatedEmail[]>([]);
  const [showInbox, setShowInbox] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<SimulatedEmail | null>(null);
  const [publicGroupPreview, setPublicGroupPreview] = useState<Group | null>(null);

  useEffect(() => {
    // Session Recovery
    try {
      const saved = localStorage.getItem('autolink_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          setCurrentUser(parsed);
        }
      }
    } catch (e) {
      console.warn("Auto-Link: Failed to parse user session", e);
      localStorage.removeItem('autolink_user');
    }

    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/join/@')) {
        const username = hash.split('@')[1];
        localStorage.setItem('autolink_pending_join', username);
        
        // Find group for preview
        const db = getDB();
        const group = db.groups.find(g => g.username === username);
        if (group) {
          setPublicGroupPreview(group);
        }
      } else if (hash === '' || hash === '#/') {
        setPublicGroupPreview(null);
      }
    };

    const handleNewEmail = (e: any) => {
      const email = e.detail as SimulatedEmail;
      setNotifications(prev => [email, ...prev]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== email.id));
      }, 10000);
    };

    const handleToggleInbox = () => {
      setShowInbox(prev => !prev);
    };

    window.addEventListener('hashchange', handleHash);
    window.addEventListener('new-simulated-email', handleNewEmail);
    window.addEventListener('toggle-inbox', handleToggleInbox);
    handleHash();
    
    return () => {
      window.removeEventListener('hashchange', handleHash);
      window.removeEventListener('new-simulated-email', handleNewEmail);
      window.removeEventListener('toggle-inbox', handleToggleInbox);
    };
  }, []);

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('autolink_user');
    window.location.hash = '';
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('autolink_user', JSON.stringify(user));
    
    const pendingJoin = localStorage.getItem('autolink_pending_join');
    if (pendingJoin) {
      const db = getDB();
      const group = db.groups.find(g => g.username === pendingJoin);
      if (group) {
        setActiveGroupId(group.id);
        setCurrentView('group');
      }
    }
  };

  const getAssistantContext = () => {
    if (publicGroupPreview) return `Viewing Public Group: ${publicGroupPreview.name}`;
    if (currentView === 'group' && activeGroupId) {
      const group = getDB().groups.find(g => g.id === activeGroupId);
      return group ? `Group: ${group.name}` : undefined;
    }
    if (currentView === 'event' && activeEventId) {
      const event = getDB().events.find(e => e.id === activeEventId);
      return event ? `Meeting: ${event.title}` : undefined;
    }
    return undefined;
  };

  // If user is at a join link but not logged in, show the preview landing
  if (!currentUser && publicGroupPreview) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full text-center border border-slate-100">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center font-bold text-3xl mx-auto mb-6">
            {publicGroupPreview.name[0]}
          </div>
          <h1 className="text-3xl font-bold text-slate-800">{publicGroupPreview.name}</h1>
          <p className="text-emerald-600 font-mono text-sm mb-6">@{publicGroupPreview.username}</p>
          <p className="text-slate-500 text-sm mb-8">
            You've been invited to join this group on Auto-Link. 
            Sign in or create an account to participate in meetups and track payments.
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => { setPublicGroupPreview(null); window.location.hash = ''; }}
              className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all"
            >
              Sign Up to Join
            </button>
            <button 
              onClick={() => { setPublicGroupPreview(null); window.location.hash = ''; }}
              className="w-full py-4 text-slate-500 font-bold hover:text-slate-700 transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
        <AIAssistant currentView="Public Group Preview" activeContext={`Group: ${publicGroupPreview.name}`} />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <AuthView onLogin={handleLoginSuccess} />
        <EmailNotificationOverlay 
          notifications={notifications} 
          onOpen={(email) => { setSelectedEmail(email); setShowInbox(true); }}
        />
        {showInbox && (
          <SimulatedInboxModal 
            emails={getDB().simulatedEmails} 
            onClose={() => setShowInbox(false)}
            selectedEmail={selectedEmail}
            setSelectedEmail={setSelectedEmail}
          />
        )}
        <AIAssistant currentView="Authentication/Login" />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-emerald-700 text-white p-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 
            className="text-2xl font-bold tracking-tight cursor-pointer" 
            onClick={() => { setCurrentView('dashboard'); window.location.hash = ''; }}
          >
            Auto-Link
          </h1>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowInbox(true)}
              className="relative p-2 hover:bg-emerald-600 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              {getDB().simulatedEmails.length > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-emerald-700">!</span>
              )}
            </button>
            <span className="hidden md:inline text-emerald-100">Welcome, <b>{currentUser.fullName}</b></span>
            <button 
              onClick={handleLogout}
              className="bg-emerald-600 hover:bg-emerald-500 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {currentView === 'dashboard' && (
          <Dashboard 
            user={currentUser} 
            onGroupSelect={(id) => { setActiveGroupId(id); setCurrentView('group'); }}
            onEventSelect={(id) => { setActiveEventId(id); setCurrentView('event'); }}
          />
        )}
        
        {currentView === 'group' && activeGroupId && (
          <GroupView 
            groupId={activeGroupId} 
            userId={currentUser.id}
            onBack={() => { setCurrentView('dashboard'); window.location.hash = ''; }}
            onEventSelect={(id) => { setActiveEventId(id); setCurrentView('event'); }}
          />
        )}

        {currentView === 'event' && activeEventId && (
          <EventDashboard 
            eventId={activeEventId} 
            currentUserId={currentUser.id}
            onBack={() => setCurrentView('dashboard')} 
          />
        )}
      </main>

      <EmailNotificationOverlay 
        notifications={notifications} 
        onOpen={(email) => { setSelectedEmail(email); setShowInbox(true); }}
      />
      
      {showInbox && (
        <SimulatedInboxModal 
          emails={getDB().simulatedEmails} 
          onClose={() => setShowInbox(false)}
          selectedEmail={selectedEmail}
          setSelectedEmail={setSelectedEmail}
        />
      )}

      <AIAssistant 
        currentView={currentView} 
        activeContext={getAssistantContext()}
      />
      
      <footer className="mt-12 py-8 bg-slate-900 text-slate-400 text-center text-sm">
        <p>&copy; 2024 Auto-Link Kenya. Secure Payments simulated for demo purposes.</p>
      </footer>
    </div>
  );
};

const EmailNotificationOverlay: React.FC<{ 
  notifications: SimulatedEmail[], 
  onOpen: (email: SimulatedEmail) => void 
}> = ({ notifications, onOpen }) => {
  return (
    <div className="fixed top-20 right-4 z-[200] space-y-2 pointer-events-none">
      {notifications.map(n => (
        <div 
          key={n.id} 
          className="bg-white border-l-4 border-emerald-500 shadow-2xl rounded-lg p-4 w-72 animate-slideIn pointer-events-auto cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => onOpen(n)}
        >
          <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Incoming Email</p>
          <p className="text-sm font-bold truncate text-slate-800">{n.subject}</p>
          <p className="text-xs text-slate-500 truncate mt-1">To: {n.to}</p>
          <div className="flex justify-end mt-2">
            <span className="text-[10px] text-blue-600 font-bold uppercase">Click to open Inbox →</span>
          </div>
        </div>
      ))}
    </div>
  );
};

const SimulatedInboxModal: React.FC<{ 
  emails: SimulatedEmail[], 
  onClose: () => void,
  selectedEmail: SimulatedEmail | null,
  setSelectedEmail: (e: SimulatedEmail | null) => void
}> = ({ emails, onClose, selectedEmail, setSelectedEmail }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[201] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex overflow-hidden">
        <div className="w-1/3 border-r bg-slate-50 overflow-y-auto">
          <div className="p-6 border-b bg-white flex justify-between items-center sticky top-0 z-10">
            <h2 className="text-xl font-bold text-slate-800">Mock Inbox</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="divide-y">
            {emails.length === 0 ? (
              <p className="p-8 text-center text-slate-400 text-sm italic">No emails yet</p>
            ) : emails.map(email => (
              <div 
                key={email.id} 
                onClick={() => setSelectedEmail(email)}
                className={`p-4 cursor-pointer hover:bg-white transition-colors border-l-4 ${selectedEmail?.id === email.id ? 'bg-white border-emerald-500' : 'border-transparent'}`}
              >
                <p className="text-xs font-bold text-slate-800 truncate">{email.subject}</p>
                <p className="text-[10px] text-slate-500 mt-1">{email.to}</p>
                <p className="text-[9px] text-slate-400 mt-1">{new Date(email.timestamp).toLocaleTimeString()}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 flex flex-col bg-white">
          {selectedEmail ? (
            <div className="flex-1 overflow-y-auto p-10">
              <div className="border-b pb-6 mb-8">
                <h3 className="text-2xl font-bold text-slate-800 mb-2">{selectedEmail.subject}</h3>
                <p className="text-sm text-slate-500">From: <b>Auto-Link Systems</b> &lt;noreply@auto-link.co.ke&gt;</p>
                <p className="text-sm text-slate-500">To: <b>{selectedEmail.to}</b></p>
                <p className="text-[10px] text-slate-400 mt-2 italic">Sent on: {new Date(selectedEmail.timestamp).toLocaleString()}</p>
              </div>
              <div 
                className="prose prose-sm max-w-none text-slate-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-300 flex-col gap-4">
              <svg className="w-20 h-20 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              <p className="font-medium italic">Select an email to view content</p>
            </div>
          )}
          <div className="p-4 border-t bg-slate-50 flex justify-end">
            <button onClick={onClose} className="px-6 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold shadow-lg hover:bg-slate-900 transition-colors">Close Inbox</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;

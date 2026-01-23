
import React, { useState } from 'react';
import { User } from '../types';
import { registerUser, findUserByUsername, verifyUserEmail, joinGroup } from '../services/db';

interface AuthProps {
  onLogin: (user: User) => void;
}

type AuthStep = 'login' | 'register' | 'verify';

const AuthView: React.FC<AuthProps> = ({ onLogin }) => {
  const [step, setStep] = useState<AuthStep>('login');
  const [error, setError] = useState('');
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    hcode: '',
    password: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (step === 'login') {
      const user = findUserByUsername(formData.username);
      if (user && formData.password === 'password') { // Mocking password check
        if (!user.isVerified) {
          setPendingUser(user);
          setStep('verify');
          setError('Please verify your email before logging in.');
          return;
        }
        checkPendingJoin(user);
      } else {
        setError('Invalid username or password (use "password")');
      }
    } else if (step === 'register') {
      try {
        if (!formData.email.includes('@')) throw new Error("Invalid email");
        if (formData.phone.length < 10) throw new Error("Invalid phone number");
        
        const newUser = registerUser({
          fullName: formData.fullName,
          username: formData.username,
          email: formData.email,
          phone: formData.phone,
          hcode: formData.hcode
        });
        
        setPendingUser(newUser);
        setStep('verify');
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!pendingUser) return;

    try {
      const verifiedUser = verifyUserEmail(pendingUser.id, verificationCode);
      checkPendingJoin(verifiedUser);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const checkPendingJoin = (user: User) => {
    const pendingJoin = localStorage.getItem('autolink_pending_join');
    if (pendingJoin) {
      try {
        joinGroup(user.id, pendingJoin);
        localStorage.removeItem('autolink_pending_join');
      } catch (e) {}
    }
    onLogin(user);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-700 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-emerald-800">Auto-Link</h1>
          <p className="text-slate-500 mt-2">Connecting communities in Kenya</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
            {error}
          </div>
        )}

        {step === 'verify' ? (
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-800">Verify Your Email</h2>
              <p className="text-sm text-slate-500 mt-1">
                We've sent a 6-digit code to <br/>
                <span className="font-bold text-emerald-700">{pendingUser?.email}</span>
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 text-center">Enter Code</label>
              <input 
                required
                type="text" 
                maxLength={6}
                placeholder="000000"
                className="w-full text-center text-3xl tracking-[0.5em] font-mono px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none border-emerald-100"
                value={verificationCode}
                onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-all shadow-md active:scale-95"
            >
              Verify & Continue
            </button>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
              <p className="text-xs text-blue-700 font-medium mb-2">Can't find the email in your real inbox?</p>
              <button 
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('toggle-inbox'))}
                className="text-sm font-bold text-blue-800 underline hover:text-blue-900"
              >
                Open Simulated Inbox Overlay
              </button>
            </div>

            <div className="text-center">
              <button 
                type="button"
                onClick={() => setStep('login')}
                className="text-slate-400 hover:text-slate-600 text-xs transition-colors"
              >
                Back to Login
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.fullName}
                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone (Primary ID)</label>
                    <input 
                      required
                      type="tel" 
                      placeholder="07..."
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input 
                      required
                      type="email" 
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
              <input 
                required
                type="text" 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
              />
            </div>

            {step === 'register' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Personal Hcode (Unique Code)</label>
                <input 
                  required
                  type="text" 
                  placeholder="e.g. USER-77"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={formData.hcode}
                  onChange={e => setFormData({...formData, hcode: e.target.value})}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input 
                required
                type="password" 
                placeholder={step === 'login' ? 'Use "password"' : ''}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-all shadow-md active:scale-95"
            >
              {step === 'login' ? 'Login' : 'Create Account'}
            </button>

            <div className="mt-6 text-center">
              <button 
                type="button"
                onClick={() => setStep(step === 'login' ? 'register' : 'login')}
                className="text-emerald-600 hover:underline text-sm font-medium"
              >
                {step === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Login"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthView;

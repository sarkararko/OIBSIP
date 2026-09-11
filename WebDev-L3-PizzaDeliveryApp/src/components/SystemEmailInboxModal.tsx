import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  CheckCircle2, 
  ExternalLink, 
  AlertTriangle, 
  Clock, 
  RefreshCw, 
  KeyRound, 
  Pizza,
  Check
} from 'lucide-react';
import { SystemEmail } from '../types';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../config/api';

interface SystemEmailInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToView: (view: string, data?: any) => void;
}

export const SystemEmailInboxModal: React.FC<SystemEmailInboxModalProps> = ({
  isOpen,
  onClose,
  onNavigateToView
}) => {
  const { user, refreshUser } = useAuth();
  const [emails, setEmails] = useState<SystemEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<SystemEmail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchEmails();
    }
  }, [isOpen]);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      const res = await fetch(apiUrl('/api/emails'));
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails || []);
        if (data.emails.length > 0 && !selectedEmail) {
          setSelectedEmail(data.emails[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch system emails:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleExecuteEmailAction = async (email: SystemEmail) => {
    // Mark as read
    try {
      await fetch(apiUrl('/api/emails/mark-read'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: email.id })
      });
    } catch {
      // ignore
    }

    if (email.type === 'verification') {
      // Extract token or link
      const match = email.content.match(/token:\s*([^\s\n]+)/);
      const token = match ? match[1] : null;

      if (token) {
        try {
          const res = await fetch(apiUrl('/api/auth/verify-email'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, email: email.to })
          });
          const data = await res.json();
          if (res.ok) {
            setActionNotice('Email verified successfully! Your account is now active.');
            refreshUser();
          } else {
            setActionNotice(data.error || 'Verification failed.');
          }
        } catch {
          setActionNotice('Verification server error.');
        }
      }
    } else if (email.type === 'low_stock_alert') {
      onClose();
      onNavigateToView('admin');
    } else if (email.type === 'order_confirmation') {
      onClose();
      onNavigateToView('orders');
    } else if (email.type === 'password_reset') {
      // Extract token
      const match = email.content.match(/Reset Token:\s*([^\s\n]+)/);
      const token = match ? match[1] : null;
      if (token) {
        const newPass = prompt(`Reset Password for ${email.to}\nEnter your new password:`, 'newpassword123');
        if (newPass) {
          const res = await fetch(apiUrl('/api/auth/reset-password'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, newPassword: newPass })
          });
          if (res.ok) {
            alert('Password reset successful! You can now sign in with your new password.');
          } else {
            alert('Failed to reset password.');
          }
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-slate-900 text-slate-100 w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[88vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base text-white font-display">System Email Dispatch Center</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  LIVE SIMULATOR
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Inspect verification links, password reset tokens, and automated low-stock admin warnings in real-time.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchEmails}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Refresh Mailbox"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Notice */}
        {actionNotice && (
          <div className="bg-emerald-950/90 border-b border-emerald-500/40 text-emerald-300 text-xs px-6 py-2.5 flex items-center justify-between">
            <div className="flex items-center space-x-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{actionNotice}</span>
            </div>
            <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Two-Pane Layout: List & Preview */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          
          {/* Left Pane: Email List */}
          <div className="md:col-span-5 border-r border-slate-800 overflow-y-auto divide-y divide-slate-800 bg-slate-900/60 max-h-96 md:max-h-full">
            {emails.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                <Mail className="w-8 h-8 mx-auto text-slate-600" />
                <p>No emails dispatched yet.</p>
              </div>
            ) : (
              emails.map(email => (
                <button
                  key={email.id}
                  onClick={() => setSelectedEmail(email)}
                  className={`w-full text-left p-4 transition-colors space-y-1 block ${
                    selectedEmail?.id === email.id
                      ? 'bg-slate-800 border-l-4 border-amber-400 text-white'
                      : 'hover:bg-slate-800/50 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={`font-mono font-black px-2 py-0.5 rounded-full text-[10px] ${
                      email.type === 'low_stock_alert'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : email.type === 'verification'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                    }`}>
                      {email.type.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-slate-500 font-mono">
                      {new Date(email.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="font-bold text-xs truncate text-slate-100 font-display">{email.subject}</p>
                  <p className="text-[11px] text-slate-400 truncate">To: {email.to}</p>
                </button>
              ))
            )}
          </div>

          {/* Right Pane: Selected Email Reader */}
          <div className="md:col-span-7 p-6 overflow-y-auto bg-slate-950 flex flex-col justify-between space-y-6">
            {selectedEmail ? (
              <div className="space-y-4">
                
                <div className="border-b border-slate-800 pb-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Recipient: <strong className="text-slate-200">{selectedEmail.to}</strong></span>
                    <span className="text-xs text-slate-500 font-mono">{new Date(selectedEmail.createdAt).toLocaleString()}</span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-white font-display">{selectedEmail.subject}</h2>
                </div>

                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 font-mono text-xs text-slate-200 whitespace-pre-line leading-relaxed">
                  {selectedEmail.content}
                </div>

                {/* Direct Action Trigger */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400 font-medium">
                    Instant Simulation Action:
                  </div>

                  <button
                    onClick={() => handleExecuteEmailAction(selectedEmail)}
                    className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 shadow"
                  >
                    <span>
                      {selectedEmail.type === 'verification' && '1-Click Verify Email'}
                      {selectedEmail.type === 'low_stock_alert' && 'Open Admin Inventory'}
                      {selectedEmail.type === 'order_confirmation' && 'Track Live Order'}
                      {selectedEmail.type === 'password_reset' && 'Reset Password Now'}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            ) : (
              <div className="text-center text-slate-500 text-xs py-12 font-medium">
                Select an email from the left pane to view its content.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

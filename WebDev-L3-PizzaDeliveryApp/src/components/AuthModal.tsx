import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Lock, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Sparkles,
  KeyRound,
  ShieldCheck,
  Clock,
  RefreshCw,
  ShoppingBag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register' | 'forgot' | 'verify';
  initialEmail?: string;
  isPendingCheckout?: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'login',
  initialEmail = '',
  isPendingCheckout = false,
  onClose,
  onAuthSuccess,
}) => {
  const { login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'verify' | 'forgot' | 'reset'>(initialMode);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // 6-digit OTP fields
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Password reset fields
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // States
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  // Resend cooldown timer in seconds
  const [resendCooldown, setResendCooldown] = useState(0);

  // Reset state when opening or mode changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMsg(null);
      setSuccessMsg(null);
      if (initialEmail) {
        setEmail(initialEmail);
      }
    }
  }, [isOpen, initialMode, initialEmail]);

  // Handle countdown interval for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  // Masking helper: e.g. j***e@example.com
  const maskEmail = (raw: string) => {
    if (!raw || !raw.includes('@')) return raw;
    const [local, domain] = raw.split('@');
    if (local.length <= 2) {
      return `${local[0] || ''}*@${domain}`;
    }
    const visibleStart = local.slice(0, 1);
    const visibleEnd = local.slice(-1);
    const maskedPart = '*'.repeat(Math.min(local.length - 2, 4));
    return `${visibleStart}${maskedPart}${visibleEnd}@${domain}`;
  };

  // Handle OTP digit changes
  const handleOtpChange = (index: number, value: string) => {
    // Handle pasting multi-digit strings (like 123456)
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length > 1) {
      const chars = cleanValue.slice(0, 6).split('');
      const updated = [...otpDigits];
      chars.forEach((c, i) => {
        if (i < 6) updated[i] = c;
      });
      setOtpDigits(updated);
      const nextIndex = Math.min(chars.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
      return;
    }

    const singleChar = cleanValue.slice(-1);
    const updated = [...otpDigits];
    updated[index] = singleChar;
    setOtpDigits(updated);

    if (singleChar && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // 1. LOGIN HANDLER
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setUnverifiedEmail(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 && data.requiresVerification) {
          setErrorMsg(data.error || 'Please verify your email before logging in.');
          setUnverifiedEmail(data.email || email.trim());
        } else {
          setErrorMsg(data.error || 'Failed to sign in. Please check your credentials.');
        }
        setLoading(false);
        return;
      }

      login(data.token, data.user);
      if (onAuthSuccess) {
        onAuthSuccess();
      } else {
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network connection failed. Please try again.');
      setLoading(false);
    }
  };

  // 2. REGISTER HANDLER
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          phone: phone.trim(),
          address: address.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Registration failed.');
        setLoading(false);
        return;
      }

      // Successful registration: transition immediately to OTP verification screen
      setMode('verify');
      setOtpDigits(['', '', '', '', '', '']);
      setSuccessMsg('Verification code sent to your email address. Please check your inbox.');
      setResendCooldown(60);
      setLoading(false);

      // Auto-focus first OTP input after mode transition
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration request failed. Please try again.');
      setLoading(false);
    }
  };

  // 3. VERIFY OTP HANDLER
  const handleVerifyEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const enteredOtp = otpDigits.join('').trim();
    if (enteredOtp.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the verification code.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otp: enteredOtp,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Verification failed. Please check the code and try again.');
        setLoading(false);
        return;
      }

      setSuccessMsg('Email verified successfully! Welcome to PizzaCraft.');

      // Complete login if token returned
      if (data.token && data.user) {
        login(data.token, data.user);
      }

      setTimeout(() => {
        if (onAuthSuccess) {
          onAuthSuccess();
        } else {
          onClose();
        }
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification request failed. Please try again.');
      setLoading(false);
    }
  };

  // 4. RESEND OTP HANDLER
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setResending(true);

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429 && data.cooldownRemaining) {
          setResendCooldown(data.cooldownRemaining);
        }
        setErrorMsg(data.error || 'Failed to resend verification code.');
        setResending(false);
        return;
      }

      setSuccessMsg('A fresh verification code has been sent to your email.');
      setResendCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
      setResending(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend code. Please try again.');
      setResending(false);
    }
  };

  // 5. FORGOT PASSWORD HANDLER
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Request failed. Please try again.');
        setLoading(false);
        return;
      }

      setSuccessMsg('Password reset code sent to your email address.');
      setMode('reset');
      setLoading(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Forgot password request failed.');
      setLoading(false);
    }
  };

  // 6. RESET PASSWORD HANDLER
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otp: resetCode.trim(),
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Password reset failed.');
        setLoading(false);
        return;
      }

      setSuccessMsg('Password updated successfully! Please sign in with your new password.');
      setMode('login');
      setPassword('');
      setLoading(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Password reset request failed.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 text-slate-100 w-full max-w-md rounded-3xl shadow-2xl border border-slate-800 overflow-hidden relative">
        
        {/* Checkout Interruption Banner */}
        {isPendingCheckout && (
          <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border-b border-amber-500/30 px-6 py-2.5 flex items-center space-x-2 text-xs text-amber-200">
            <ShoppingBag className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-medium">Please sign in to proceed directly to your order summary!</span>
          </div>
        )}

        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 inline-block">
              {mode === 'login' && 'User Authorization'}
              {mode === 'register' && 'Member Registration'}
              {mode === 'verify' && 'Email Verification'}
              {mode === 'forgot' && 'Password Recovery'}
              {mode === 'reset' && 'Reset Password'}
            </span>
            <h2 className="text-xl font-bold font-display text-white mt-1.5">
              {mode === 'login' && 'Sign in to PizzaCraft'}
              {mode === 'register' && 'Create Your Foodie Account'}
              {mode === 'verify' && 'Verify Your Email'}
              {mode === 'forgot' && 'Forgot Your Password?'}
              {mode === 'reset' && 'Set New Password'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {mode === 'verify' && 'Enter the 6-digit verification code sent to your email address.'}
              {mode === 'login' && 'Access your orders, custom creations, and rewards.'}
              {mode === 'register' && 'Join PizzaCraft for fresh stone-fired deliveries.'}
              {mode === 'forgot' && 'Enter your email to receive a recovery code.'}
              {mode === 'reset' && 'Enter the code received in your email and your new password.'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          
          {/* Error Message Display */}
          {errorMsg && (
            <div className="bg-red-950/80 border border-red-500/40 text-red-300 text-xs p-3.5 rounded-2xl flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <p className="font-medium">{errorMsg}</p>
                {unverifiedEmail && (
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(unverifiedEmail);
                      setMode('verify');
                      setErrorMsg(null);
                      setOtpDigits(['', '', '', '', '', '']);
                    }}
                    className="inline-flex items-center space-x-1 text-amber-400 hover:text-amber-300 font-bold underline text-xs"
                  >
                    <span>Verify this email address now</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Success Message Display */}
          {successMsg && (
            <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs p-3.5 rounded-2xl flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW: VERIFY EMAIL SCREEN (6-DIGIT REAL SMTP OTP)         */}
          {/* ======================================================== */}
          {mode === 'verify' && (
            <div className="space-y-5">
              {/* Target Email Banner */}
              <div className="bg-slate-850 border border-slate-700/70 p-3.5 rounded-2xl text-xs space-y-1 text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Verification code sent to:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-amber-400 hover:text-amber-300 font-medium text-[11px] hover:underline"
                  >
                    Edit email
                  </button>
                </div>
                <p className="text-white font-mono font-bold text-sm">
                  {maskEmail(email)}
                </p>
                <p className="text-[11px] text-slate-400 pt-0.5">
                  Please check your inbox (and spam folder) for the 6-digit verification code.
                </p>
              </div>

              {/* 6 Digit OTP Inputs */}
              <div className="space-y-2">
                <label className="block text-slate-300 font-semibold text-xs text-center">
                  6-Digit Verification Code
                </label>
                <div className="flex items-center justify-center space-x-2 sm:space-x-3">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      id={`otp-input-${idx}`}
                      className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-mono font-bold bg-slate-800 border-2 border-slate-700 focus:border-amber-400 focus:bg-slate-850 rounded-xl text-white outline-none transition-all shadow-inner"
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>
              </div>

              {/* Expiration Note */}
              <div className="flex items-center justify-center space-x-1.5 text-xs text-amber-300/90 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>Code expires in 10 minutes.</span>
              </div>

              {/* Action Buttons: Verify & Resend */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  id="btn-verify-email"
                  onClick={() => handleVerifyEmail()}
                  disabled={loading || otpDigits.join('').length !== 6}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-bold text-sm shadow-lg shadow-amber-950/40 transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify Email</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  id="btn-resend-otp"
                  onClick={handleResendOtp}
                  disabled={resending || resendCooldown > 0}
                  className="w-full py-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white font-semibold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                  <span>
                    {resendCooldown > 0
                      ? `Resend Code (${resendCooldown}s)`
                      : resending
                      ? 'Sending...'
                      : 'Resend Code'}
                  </span>
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW: LOGIN FORM                                         */}
          {/* ======================================================== */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-300 font-semibold">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    id="input-login-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="user@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-300 font-semibold">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] text-amber-300 hover:underline font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    id="input-login-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="btn-login-submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-bold text-sm shadow-lg shadow-amber-950/40 transition-all active:scale-98 disabled:opacity-50 mt-2 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>

              <div className="text-center pt-3 border-t border-slate-800 text-slate-400 text-xs">
                Don't have a PizzaCraft account?{' '}
                <button
                  type="button"
                  id="btn-switch-to-register"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-amber-400 hover:text-amber-300 font-bold hover:underline"
                >
                  Create an account
                </button>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* VIEW: REGISTRATION FORM                                  */}
          {/* ======================================================== */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-300 font-semibold">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    id="input-register-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Mario Rossi"
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-semibold">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    id="input-register-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="user@example.com"
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  A 6-digit verification code will be sent to this email address.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-semibold">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    id="input-register-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      id="input-register-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold">Delivery Address</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      id="input-register-address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street, City"
                      className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                id="btn-register-submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-bold text-sm shadow-lg shadow-amber-950/40 transition-all active:scale-98 disabled:opacity-50 mt-3 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending Verification Code...</span>
                  </>
                ) : (
                  <span>Create Account & Verify</span>
                )}
              </button>

              <div className="text-center pt-3 border-t border-slate-800 text-slate-400 text-xs">
                Already have an account?{' '}
                <button
                  type="button"
                  id="btn-switch-to-login"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-amber-400 hover:text-amber-300 font-bold hover:underline"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* VIEW: FORGOT PASSWORD                                    */}
          {/* ======================================================== */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-300 font-semibold">Registered Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    id="input-forgot-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="user@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="btn-forgot-submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-bold text-sm shadow-lg shadow-amber-950/40 transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending Reset Code...</span>
                  </>
                ) : (
                  <span>Send Recovery Code</span>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* VIEW: RESET PASSWORD                                     */}
          {/* ======================================================== */}
          {mode === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-300 font-semibold">6-Digit Reset Code from Email</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    id="input-reset-code"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    required
                    placeholder="123456"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono tracking-widest text-base focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-semibold">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    id="input-reset-new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-300 font-semibold">Confirm New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    id="input-reset-confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Re-enter new password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="btn-reset-submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-bold text-sm shadow-lg shadow-amber-950/40 transition-all active:scale-98 disabled:opacity-50 mt-2 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

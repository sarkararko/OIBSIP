import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { DataStore } from '../models/index.js';
import { UserModel } from '../models/User.js';
import { AdminModel } from '../models/Admin.js';
import { VerificationTokenModel } from '../models/VerificationToken.js';
import { PasswordResetTokenModel } from '../models/PasswordResetToken.js';
import { isMongoConnected } from '../config/db.js';
import { JWT_SECRET, authenticateJWT, optionalAuth, AuthRequest } from '../middleware/auth.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendEmailNotification,
  getSmtpConfigInfo,
} from '../services/emailService.js';

const router = Router();

const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email?.trim());
};

// Helper for Admin Login
const adminLoginHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Admin email and master password required' });
      return;
    }

    const emailLower = email.toLowerCase();
    let admin: any = null;

    if (isMongoConnected()) {
      admin = await (AdminModel as any).findOne({ email: emailLower });
      if (!admin && emailLower === 'admin@pizzacraft.com') {
        const salt = bcrypt.genSaltSync(10);
        admin = await (AdminModel as any).create({
          name: 'Executive Chef Mario',
          email: 'admin@pizzacraft.com',
          passwordHash: bcrypt.hashSync('admin123', salt),
          role: 'admin',
          permissions: ['all'],
          lastLogin: new Date(),
        });
      }
    }

    // Also check DataStore
    const db = DataStore.getData();
    let dsAdmin = db.admins.find((a) => a.email.toLowerCase() === emailLower);
    if (!dsAdmin && emailLower === 'admin@pizzacraft.com') {
      const salt = bcrypt.genSaltSync(10);
      dsAdmin = {
        id: 'adm_master_01',
        name: 'Executive Chef Mario',
        email: 'admin@pizzacraft.com',
        passwordHash: bcrypt.hashSync('admin123', salt),
        role: 'admin',
        permissions: ['all'],
        lastLogin: new Date().toISOString(),
      };
      db.admins.push(dsAdmin);
      DataStore.saveToDisk();
    }

    if (!admin && dsAdmin) {
      admin = dsAdmin;
    }

    if (!admin) {
      res.status(401).json({ error: 'Invalid administrator credentials' });
      return;
    }

    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(password, admin.passwordHash);
    } catch {
      isMatch = false;
    }

    // Master password fallback for demo convenience
    if (!isMatch && password === 'admin123') {
      isMatch = true;
    }

    if (!isMatch) {
      res.status(401).json({ error: 'Invalid administrator credentials' });
      return;
    }

    const adminId = admin._id ? admin._id.toString() : admin.id || 'adm_master_01';

    if (isMongoConnected() && admin._id) {
      admin.lastLogin = new Date();
      await admin.save();
    }
    if (dsAdmin) {
      dsAdmin.lastLogin = new Date().toISOString();
      DataStore.saveToDisk();
    }

    const token = jwt.sign(
      { id: adminId, email: admin.email, name: admin.name, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const adminPayload = {
      id: adminId,
      name: admin.name,
      email: admin.email,
      role: 'admin' as const,
      isVerified: true,
      permissions: admin.permissions || ['all'],
      createdAt: admin.lastLogin || new Date().toISOString(),
    };

    res.json({
      message: 'Admin access authorized',
      token,
      user: adminPayload,
      admin: adminPayload,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Admin login failed' });
  }
};

// 1. Customer Registration
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone, address } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required' });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Please enter a valid email address' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long' });
      return;
    }

    const emailLower = email.toLowerCase().trim();
    const db = DataStore.getData();

    // Check existing
    let existingMongoUser: any = null;
    if (isMongoConnected()) {
      existingMongoUser = await (UserModel as any).findOne({ email: emailLower });
    }
    const existingDsUser = db.users.find((u) => u.email.toLowerCase() === emailLower);
    const existingUser = existingMongoUser || existingDsUser;

    if (existingUser && (existingUser.isVerified || existingUser.emailVerified)) {
      res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
      return;
    }

    // Generate secure random 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const salt = await bcrypt.genSalt(10);
    const verificationOtpHash = await bcrypt.hash(otp, salt);
    const verificationOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const passwordHash = await bcrypt.hash(password, salt);

    // Send real verification email via Nodemailer SMTP BEFORE completing registration
    try {
      await sendVerificationEmail(emailLower, name, otp);
    } catch (emailErr: any) {
      console.error(`❌ [Register] Failed to send verification email to <${emailLower}>:`, emailErr?.message || emailErr);
      res.status(500).json({
        error: 'Unable to send verification email. Please check your SMTP configuration and try again.',
      });
      return;
    }

    const userId = existingUser?.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const userAddresses = address ? [{ street: address, city: 'Mumbai', pincode: '400001', notes: '' }] : [];

    // Store in MongoDB
    if (isMongoConnected()) {
      if (existingMongoUser) {
        existingMongoUser.name = name;
        existingMongoUser.passwordHash = passwordHash;
        existingMongoUser.phone = phone || '';
        existingMongoUser.isVerified = false;
        existingMongoUser.emailVerified = false;
        existingMongoUser.verificationOtpHash = verificationOtpHash;
        existingMongoUser.verificationOtpExpiresAt = verificationOtpExpiresAt;
        existingMongoUser.lastOtpSentAt = new Date();
        if (address) existingMongoUser.addresses = userAddresses;
        await existingMongoUser.save();
      } else {
        await (UserModel as any).create({
          id: userId,
          name,
          email: emailLower,
          passwordHash,
          phone: phone || '',
          isVerified: false,
          emailVerified: false,
          verificationOtpHash,
          verificationOtpExpiresAt,
          lastOtpSentAt: new Date(),
          addresses: userAddresses,
          role: 'user',
        });
      }
    }

    // Update DataStore JSON
    if (existingDsUser) {
      existingDsUser.name = name;
      existingDsUser.passwordHash = passwordHash;
      existingDsUser.phone = phone || '';
      existingDsUser.isVerified = false;
      (existingDsUser as any).emailVerified = false;
      (existingDsUser as any).verificationOtpHash = verificationOtpHash;
      (existingDsUser as any).verificationOtpExpiresAt = verificationOtpExpiresAt.toISOString();
      (existingDsUser as any).lastOtpSentAt = new Date().toISOString();
      if (address) existingDsUser.addresses = userAddresses as any;
    } else {
      const newUser = {
        id: userId,
        name,
        email: emailLower,
        passwordHash,
        phone: phone || '',
        isVerified: false,
        emailVerified: false,
        verificationOtpHash,
        verificationOtpExpiresAt: verificationOtpExpiresAt.toISOString(),
        lastOtpSentAt: new Date().toISOString(),
        addresses: userAddresses as any,
        role: 'user',
        createdAt: new Date().toISOString(),
      };
      db.users.push(newUser as any);
    }
    DataStore.saveToDisk();

    // Do NOT return JWT token before verification
    res.status(201).json({
      message: 'Account created! Verification code sent to your email address.',
      email: emailLower,
      requiresVerification: true,
    });
  } catch (err: any) {
    console.error('❌ [Register] Unexpected error:', err?.message || err);
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// 2. Email Verification with 6-Digit OTP
router.post('/verify-email', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp, token: inputToken } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email address is required' });
      return;
    }

    const code = (otp || inputToken || '').toString().trim();
    if (!code) {
      res.status(400).json({ error: '6-digit verification code is required' });
      return;
    }

    const emailLower = email.toLowerCase().trim();
    let user: any = null;

    if (isMongoConnected()) {
      user = await (UserModel as any).findOne({ email: emailLower });
    }
    if (!user) {
      const db = DataStore.getData();
      user = db.users.find((u) => u.email.toLowerCase() === emailLower);
    }

    if (!user) {
      res.status(404).json({ error: 'No account found with this email address.' });
      return;
    }

    if (user.isVerified && user.emailVerified) {
      const userId = user._id ? user._id.toString() : user.id;
      const jwtToken = jwt.sign(
        { id: userId, email: user.email, name: user.name, role: user.role || 'user' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      res.json({
        message: 'Email is already verified. You are now logged in.',
        alreadyVerified: true,
        token: jwtToken,
        user: {
          id: userId,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          isVerified: true,
          emailVerified: true,
          role: user.role || 'user',
        },
      });
      return;
    }

    // Check code expiry
    if (!user.verificationOtpHash || !user.verificationOtpExpiresAt) {
      res.status(400).json({ error: 'No active verification code found. Please request a new code.' });
      return;
    }

    if (new Date() > new Date(user.verificationOtpExpiresAt)) {
      res.status(400).json({ error: 'Verification code has expired. Please click "Resend Code".' });
      return;
    }

    // Compare hashed OTP using bcrypt
    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(code, user.verificationOtpHash);
    } catch {
      isMatch = false;
    }

    if (!isMatch) {
      res.status(400).json({ error: 'Invalid verification code. Please check your email and try again.' });
      return;
    }

    // Mark user as verified
    if (isMongoConnected()) {
      await (UserModel as any).findOneAndUpdate(
        { email: emailLower },
        {
          isVerified: true,
          emailVerified: true,
          verificationOtpHash: null,
          verificationOtpExpiresAt: null,
        }
      );
    }

    const db = DataStore.getData();
    const dsUser = db.users.find((u) => u.email.toLowerCase() === emailLower);
    if (dsUser) {
      dsUser.isVerified = true;
      (dsUser as any).emailVerified = true;
      (dsUser as any).verificationOtpHash = null;
      (dsUser as any).verificationOtpExpiresAt = null;
      DataStore.saveToDisk();
    }

    const userId = user._id ? user._id.toString() : user.id;
    const token = jwt.sign(
      { id: userId, email: user.email, name: user.name, role: user.role || 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Email verified successfully! Your account is now active.',
      token,
      user: {
        id: userId,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        isVerified: true,
        emailVerified: true,
        role: user.role || 'user',
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    console.error('❌ [VerifyEmail] Error:', err?.message || err);
    res.status(500).json({ error: err.message || 'Verification failed' });
  }
});

// 2.5 Resend Verification OTP
router.post('/resend-verification', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email address is required' });
      return;
    }

    const emailLower = email.toLowerCase().trim();
    let user: any = null;

    if (isMongoConnected()) {
      user = await (UserModel as any).findOne({ email: emailLower });
    }
    if (!user) {
      const db = DataStore.getData();
      user = db.users.find((u) => u.email.toLowerCase() === emailLower);
    }

    if (!user) {
      res.status(404).json({ error: 'No account found with this email address.' });
      return;
    }

    if (user.isVerified && user.emailVerified) {
      res.status(400).json({ error: 'This email is already verified. Please sign in.' });
      return;
    }

    // Rate limit cooldown check (60 seconds)
    if (user.lastOtpSentAt) {
      const elapsedMs = Date.now() - new Date(user.lastOtpSentAt).getTime();
      const cooldownMs = 60 * 1000;
      if (elapsedMs < cooldownMs) {
        const remainingSec = Math.ceil((cooldownMs - elapsedMs) / 1000);
        res.status(429).json({
          error: `Please wait ${remainingSec} seconds before requesting a new code.`,
          cooldownRemaining: remainingSec,
        });
        return;
      }
    }

    // Generate new 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const salt = await bcrypt.genSalt(10);
    const verificationOtpHash = await bcrypt.hash(otp, salt);
    const verificationOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Send real email via Nodemailer SMTP
    try {
      await sendVerificationEmail(emailLower, user.name, otp);
    } catch (emailErr: any) {
      console.error(`❌ [ResendVerification] Failed to send email to <${emailLower}>:`, emailErr?.message || emailErr);
      res.status(500).json({
        error: 'Unable to send verification email. Please try again.',
      });
      return;
    }

    // Update MongoDB
    if (isMongoConnected()) {
      await (UserModel as any).findOneAndUpdate(
        { email: emailLower },
        {
          verificationOtpHash,
          verificationOtpExpiresAt,
          lastOtpSentAt: new Date(),
        }
      );
    }

    // Update DataStore
    const db = DataStore.getData();
    const dsUser = db.users.find((u) => u.email.toLowerCase() === emailLower);
    if (dsUser) {
      (dsUser as any).verificationOtpHash = verificationOtpHash;
      (dsUser as any).verificationOtpExpiresAt = verificationOtpExpiresAt.toISOString();
      (dsUser as any).lastOtpSentAt = new Date().toISOString();
      DataStore.saveToDisk();
    }

    res.json({
      message: 'Verification code sent to your email address.',
      email: emailLower,
    });
  } catch (err: any) {
    console.error('❌ [ResendVerification] Error:', err?.message || err);
    res.status(500).json({ error: err.message || 'Failed to resend verification code' });
  }
});

// 3. Customer Login with Verification Enforcement
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const emailLower = email.toLowerCase().trim();
    let user: any = null;

    if (isMongoConnected()) {
      user = await (UserModel as any).findOne({ email: emailLower });
    }

    if (!user) {
      const db = DataStore.getData();
      user = db.users.find((u) => u.email.toLowerCase() === emailLower);
    }

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(password, user.passwordHash);
    } catch {
      isMatch = false;
    }

    // Demo fallback password
    if (!isMatch && (password === 'password123' || password === 'admin123')) {
      isMatch = true;
    }

    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Enforce email verification for customers
    if (user.role !== 'admin' && !user.isVerified && !user.emailVerified) {
      res.status(403).json({
        error: 'Please verify your email before logging in.',
        requiresVerification: true,
        email: user.email,
      });
      return;
    }

    const userId = user._id ? user._id.toString() : user.id;

    const token = jwt.sign(
      { id: userId, email: user.email, name: user.name, role: user.role || 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: userId,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        isVerified: !!user.isVerified,
        emailVerified: !!user.emailVerified,
        address: user.addresses?.[0]?.street || '',
        role: (user.role as any) || 'user',
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// 4. Forgot Password with Real SMTP Code
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const emailLower = email.toLowerCase().trim();
    let user: any = null;

    if (isMongoConnected()) {
      user = await (UserModel as any).findOne({ email: emailLower });
    }
    if (!user) {
      const db = DataStore.getData();
      user = db.users.find((u) => u.email.toLowerCase() === emailLower);
    }

    if (!user) {
      res.status(404).json({ error: 'No account found with this email address.' });
      return;
    }

    const resetOtp = crypto.randomInt(100000, 1000000).toString();
    const salt = await bcrypt.genSalt(10);
    const passwordResetOtpHash = await bcrypt.hash(resetOtp, salt);
    const passwordResetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Send real email via SMTP
    try {
      await sendPasswordResetEmail(emailLower, user.name, resetOtp);
    } catch (emailErr: any) {
      console.error(`❌ [ForgotPassword] SMTP failed for <${emailLower}>:`, emailErr?.message || emailErr);
      res.status(500).json({
        error: 'Unable to send password reset email. Please try again.',
      });
      return;
    }

    if (isMongoConnected()) {
      await (UserModel as any).findOneAndUpdate(
        { email: emailLower },
        { passwordResetOtpHash, passwordResetOtpExpiresAt }
      );
    }

    const db = DataStore.getData();
    const dsUser = db.users.find((u) => u.email.toLowerCase() === emailLower);
    if (dsUser) {
      (dsUser as any).passwordResetOtpHash = passwordResetOtpHash;
      (dsUser as any).passwordResetOtpExpiresAt = passwordResetOtpExpiresAt.toISOString();
      DataStore.saveToDisk();
    }

    res.json({
      message: 'Password reset code sent to your email address.',
      email: emailLower,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Forgot password failed' });
  }
});

// 5. Reset Password with Real Code
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, otp, newPassword, email } = req.body;
    const code = (otp || token || '').toString().trim();

    if (!newPassword || !code || !email) {
      res.status(400).json({ error: 'Email, reset code, and new password are required' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters long' });
      return;
    }

    const emailLower = email.toLowerCase().trim();
    let user: any = null;

    if (isMongoConnected()) {
      user = await (UserModel as any).findOne({ email: emailLower });
    }
    if (!user) {
      const db = DataStore.getData();
      user = db.users.find((u) => u.email.toLowerCase() === emailLower);
    }

    if (!user) {
      res.status(404).json({ error: 'No account found with this email address.' });
      return;
    }

    if (!user.passwordResetOtpHash || !user.passwordResetOtpExpiresAt) {
      res.status(400).json({ error: 'No active password reset request found. Please request a new code.' });
      return;
    }

    if (new Date() > new Date(user.passwordResetOtpExpiresAt)) {
      res.status(400).json({ error: 'Password reset code has expired. Please request a new code.' });
      return;
    }

    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(code, user.passwordResetOtpHash);
    } catch {
      isMatch = false;
    }

    if (!isMatch) {
      res.status(400).json({ error: 'Invalid reset code. Please check your email and try again.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    if (isMongoConnected()) {
      await (UserModel as any).findOneAndUpdate(
        { email: emailLower },
        {
          passwordHash: newHash,
          passwordResetOtpHash: null,
          passwordResetOtpExpiresAt: null,
        }
      );
    }

    const db = DataStore.getData();
    const dsUser = db.users.find((u) => u.email.toLowerCase() === emailLower);
    if (dsUser) {
      dsUser.passwordHash = newHash;
      (dsUser as any).passwordResetOtpHash = null;
      (dsUser as any).passwordResetOtpExpiresAt = null;
      DataStore.saveToDisk();
    }

    res.json({ message: 'Password updated successfully! Please sign in with your new password.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Password reset failed' });
  }
});

// 6. Admin Login (Supported on both /admin-login and /admin/login)
router.post('/admin-login', adminLoginHandler);
router.post('/admin/login', adminLoginHandler);

// 7. Profile /me
router.get('/me', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const db = DataStore.getData();
    if (req.user?.role === 'admin') {
      let admin = null;
      if (isMongoConnected() && req.user.email) {
        admin = await (AdminModel as any).findOne({ email: req.user.email }).select('-passwordHash').lean();
      }
      if (!admin) {
        const dsAdmin = db.admins.find((a) => a.id === req.user?.id || a.email === req.user?.email) || db.admins[0];
        if (dsAdmin) {
          const { passwordHash, ...safeAdmin } = dsAdmin;
          admin = safeAdmin;
        }
      }
      res.json({ user: admin });
    } else if (req.user?.id) {
      let user = null;
      if (isMongoConnected() && req.user.email) {
        user = await (UserModel as any).findOne({ email: req.user.email }).select('-passwordHash').lean();
      }
      if (!user) {
        const dsUser = db.users.find((u) => u.id === req.user?.id || u.email === req.user?.email);
        if (dsUser) {
          const { passwordHash, ...safeUser } = dsUser;
          user = safeUser;
        }
      }
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.json({ user });
    } else {
      res.status(401).json({ error: 'Not authenticated' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch user profile' });
  }
});

export default router;

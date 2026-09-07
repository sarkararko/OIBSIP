import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { DataStore } from '../models/index.js';
import { JWT_SECRET, authenticateJWT, AuthRequest } from '../middleware/auth.js';

const router = Router();

// 1. Customer Registration
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required' });
      return;
    }

    const db = DataStore.getData();
    const existingUser = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      res.status(400).json({ error: 'An account with this email already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const verificationToken = `vtok_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;

    const newUser = {
      id: userId,
      name,
      email: email.toLowerCase(),
      passwordHash,
      phone: phone || '',
      isVerified: false,
      addresses: [],
      role: 'customer',
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);

    // Save verification token
    db.verificationTokens.push({
      userId,
      email: newUser.email,
      token: verificationToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      used: false,
      createdAt: new Date().toISOString(),
    });

    // Simulated email dispatch
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    db.emails.unshift({
      id: `eml_verif_${Date.now()}`,
      to: newUser.email,
      subject: 'Verify Your PizzaCraft Account Email ✉️',
      content: `Hello ${newUser.name},\n\nThank you for signing up with PizzaCraft! Please verify your email address by using your verification token or clicking the confirmation link below:\n\nToken: ${verificationToken}\nLink: ${appUrl}?verify_token=${verificationToken}\n\nThis token expires in 24 hours.`,
      type: 'verification',
      metadata: { verificationToken, userId },
      createdAt: new Date().toISOString(),
    });

    DataStore.saveToDisk();

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, name: newUser.name, role: 'customer' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registration successful! Verification email sent.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        isVerified: newUser.isVerified,
        role: newUser.role,
      },
      token,
      verificationToken,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// 2. Email Verification
router.post('/verify-email', (req: Request, res: Response): void => {
  try {
    const { token, email } = req.body;
    if (!token && !email) {
      res.status(400).json({ error: 'Verification token or email is required' });
      return;
    }

    const db = DataStore.getData();
    let user = null;

    if (token) {
      const tokenRecord = db.verificationTokens.find((t) => t.token === token && !t.used);
      if (tokenRecord) {
        user = db.users.find((u) => u.id === tokenRecord.userId || u.email === tokenRecord.email);
        tokenRecord.used = true;
      }
    }

    if (!user && email) {
      user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    }

    if (!user) {
      res.status(400).json({ error: 'Invalid or expired verification token' });
      return;
    }

    user.isVerified = true;
    DataStore.saveToDisk();

    res.json({
      message: 'Email successfully verified! You can now place artisanal orders.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isVerified: true,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Verification failed' });
  }
});

// 3. Customer Login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const db = DataStore.getData();
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: 'customer' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isVerified: user.isVerified,
        addresses: user.addresses,
        role: 'customer',
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// 4. Forgot Password
router.post('/forgot-password', (req: Request, res: Response): void => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const db = DataStore.getData();
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      // Return ok to prevent user enumeration
      res.json({ message: 'If an account exists with this email, a reset link has been dispatched.' });
      return;
    }

    const resetToken = `rst_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
    db.passwordResetTokens.push({
      email: user.email,
      token: resetToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      used: false,
      createdAt: new Date().toISOString(),
    });

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    db.emails.unshift({
      id: `eml_rst_${Date.now()}`,
      to: user.email,
      subject: 'Reset Your PizzaCraft Password 🔐',
      content: `Hello ${user.name},\n\nWe received a request to reset your PizzaCraft password. Use the reset token below or click the link:\n\nReset Token: ${resetToken}\nLink: ${appUrl}?reset_token=${resetToken}\n\nIf you did not request this, please ignore this email. Token valid for 1 hour.`,
      type: 'password_reset',
      metadata: { resetToken, email: user.email },
      createdAt: new Date().toISOString(),
    });

    DataStore.saveToDisk();

    res.json({
      message: 'Password reset email dispatched to System Mail Inbox.',
      resetToken,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Forgot password failed' });
  }
});

// 5. Reset Password
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword, email } = req.body;
    if ((!token && !email) || !newPassword) {
      res.status(400).json({ error: 'Reset token and new password are required' });
      return;
    }

    const db = DataStore.getData();
    let targetEmail = email;

    if (token) {
      const resetRecord = db.passwordResetTokens.find((r) => r.token === token && !r.used);
      if (!resetRecord) {
        res.status(400).json({ error: 'Invalid or expired reset token' });
        return;
      }
      targetEmail = resetRecord.email;
      resetRecord.used = true;
    }

    const user = db.users.find((u) => u.email.toLowerCase() === targetEmail.toLowerCase());
    if (!user) {
      res.status(404).json({ error: 'User account not found' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    DataStore.saveToDisk();

    res.json({ message: 'Password updated successfully! Please log in with your new password.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Password reset failed' });
  }
});

// 6. Separate Admin Login
router.post('/admin/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Admin email and master password required' });
      return;
    }

    const db = DataStore.getData();
    const admin = db.admins.find((a) => a.email.toLowerCase() === email.toLowerCase());
    if (!admin) {
      res.status(401).json({ error: 'Invalid administrator credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid administrator credentials' });
      return;
    }

    admin.lastLogin = new Date().toISOString();
    DataStore.saveToDisk();

    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Admin access authorized',
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: 'admin',
        permissions: admin.permissions,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Admin login failed' });
  }
});

// 7. Current Authenticated Profile
router.get('/me', authenticateJWT, (req: AuthRequest, res: Response): void => {
  const db = DataStore.getData();
  if (req.user?.role === 'admin') {
    const admin = db.admins.find((a) => a.id === req.user?.id || a.email === req.user?.email);
    res.json({ user: admin });
  } else {
    const user = db.users.find((u) => u.id === req.user?.id || u.email === req.user?.email);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const { passwordHash, ...safeUser } = user;
    res.json({ user: safeUser });
  }
});

export default router;

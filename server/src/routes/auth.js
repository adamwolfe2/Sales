/**
 * Authentication Routes
 * Handles login, invite redemption, and token management
 */

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { db } from '../db/connection.js';
import { config } from '../config.js';

const router = Router();

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await db.getOne(
      'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
      [email.toLowerCase()]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    // Generate token
    const token = jwt.sign(
      {
        userId: user.id,
        teamId: user.team_id,
        role: user.role,
        email: user.email
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        teamId: user.team_id
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Redeem invite code (for new users/clients)
router.post('/redeem', async (req, res) => {
  try {
    const { code, name } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Invite code required' });
    }

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Name required (at least 2 characters)' });
    }

    // Find valid invitation
    const invite = await db.getOne(
      `SELECT * FROM invitations
       WHERE code = $1 AND status = 'pending' AND expires_at > NOW()`,
      [code.toUpperCase()]
    );

    if (!invite) {
      return res.status(400).json({ error: 'Invalid or expired invite code' });
    }

    // Check if user already exists
    let user = await db.getOne(
      'SELECT * FROM users WHERE email = $1',
      [invite.email.toLowerCase()]
    );

    if (user) {
      // Update existing user's team
      await db.query(
        'UPDATE users SET team_id = $1, role = $2, is_active = TRUE WHERE id = $3',
        [invite.team_id, invite.role, user.id]
      );
      user.team_id = invite.team_id;
      user.role = invite.role;
    } else {
      // Create new user (no password - they use invite code auth)
      const result = await db.query(
        `INSERT INTO users (email, team_id, role, name)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [invite.email.toLowerCase(), invite.team_id, invite.role, name.trim()]
      );
      user = result.rows[0];
    }

    // Mark invite as redeemed
    await db.query(
      `UPDATE invitations SET status = 'redeemed', redeemed_at = NOW() WHERE id = $1`,
      [invite.id]
    );

    // Generate token
    const token = jwt.sign(
      {
        userId: user.id,
        teamId: user.team_id,
        role: user.role,
        email: user.email
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        teamId: user.team_id
      }
    });

  } catch (err) {
    console.error('Redeem error:', err);
    res.status(500).json({ error: 'Failed to redeem invite' });
  }
});

// Verify token (for client reconnection)
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    const decoded = jwt.verify(token, config.jwtSecret);

    // Check user still exists and is active
    const user = await db.getOne(
      'SELECT * FROM users WHERE id = $1 AND is_active = TRUE',
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Return refreshed token
    const newToken = jwt.sign(
      {
        userId: user.id,
        teamId: user.team_id,
        role: user.role,
        email: user.email
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.json({
      valid: true,
      token: newToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        teamId: user.team_id
      }
    });

  } catch (err) {
    res.status(401).json({ valid: false, error: 'Invalid token' });
  }
});

// Generate invite codes (admin only)
router.post('/invite', authenticateAdmin, async (req, res) => {
  try {
    const { emails, role = 'rep' } = req.body;
    const teamId = req.user.teamId;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'Email list required' });
    }

    const invites = [];
    const expiresAt = new Date(Date.now() + config.inviteExpiryDays * 24 * 60 * 60 * 1000);

    for (const email of emails) {
      const code = nanoid(config.inviteCodeLength).toUpperCase();

      await db.query(
        `INSERT INTO invitations (team_id, email, code, role, expires_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [teamId, email.toLowerCase(), code, role, expiresAt]
      );

      invites.push({ email, code });
    }

    res.json({ invites, expiresAt });

  } catch (err) {
    console.error('Invite generation error:', err);
    res.status(500).json({ error: 'Failed to generate invites' });
  }
});

// Middleware to verify admin role
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwtSecret);

    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export default router;
export { authenticateAdmin };

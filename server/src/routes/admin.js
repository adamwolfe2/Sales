/**
 * Admin Routes
 * CRUD operations for content management
 * All routes require admin authentication
 */

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/connection.js';
import { broadcastToTeam, getConnectedClients } from '../index.js';
import { config } from '../config.js';

const router = Router();

// Admin authentication middleware
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

// Apply to all routes
router.use(authenticateAdmin);

// ============ DASHBOARD ============

router.get('/dashboard', async (req, res) => {
  try {
    const { teamId } = req.user;

    const [objections, playbooks, testimonials, users, invites] = await Promise.all([
      db.getOne('SELECT COUNT(*) as count FROM objections WHERE team_id = $1 AND is_active = TRUE', [teamId]),
      db.getOne('SELECT COUNT(*) as count FROM playbooks WHERE team_id = $1 AND is_active = TRUE', [teamId]),
      db.getOne('SELECT COUNT(*) as count FROM testimonials WHERE team_id = $1 AND is_active = TRUE', [teamId]),
      db.getOne('SELECT COUNT(*) as count FROM users WHERE team_id = $1 AND is_active = TRUE', [teamId]),
      db.getOne('SELECT COUNT(*) as count FROM invitations WHERE team_id = $1 AND status = $2', [teamId, 'pending'])
    ]);

    const connectedClients = getConnectedClients().filter(c => c.teamId === teamId);

    res.json({
      stats: {
        objections: parseInt(objections?.count || 0),
        playbooks: parseInt(playbooks?.count || 0),
        testimonials: parseInt(testimonials?.count || 0),
        users: parseInt(users?.count || 0),
        pendingInvites: parseInt(invites?.count || 0),
        connectedClients: connectedClients.length
      },
      connectedClients
    });

  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// ============ OBJECTIONS CRUD ============

router.get('/objections', async (req, res) => {
  try {
    const { teamId } = req.user;
    const objections = await db.getAll(
      'SELECT * FROM objections WHERE team_id = $1 ORDER BY rank, name',
      [teamId]
    );
    res.json({ objections });
  } catch (err) {
    console.error('Fetch objections error:', err);
    res.status(500).json({ error: 'Failed to fetch objections' });
  }
});

router.post('/objections', async (req, res) => {
  try {
    const { teamId, userId } = req.user;
    const { name, category, variations, win_rate, difficulty, frequency, rank, responses, warning, danger_combo } = req.body;

    const result = await db.query(
      `INSERT INTO objections (team_id, name, category, variations, win_rate, difficulty, frequency, rank, responses, warning, danger_combo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [teamId, name, category, variations || [], win_rate, difficulty, frequency || 0, rank,
       JSON.stringify(responses || {}), warning, danger_combo ? JSON.stringify(danger_combo) : null]
    );

    const objection = result.rows[0];

    // Broadcast to all connected clients
    broadcastToTeam(teamId, 'content:objection:created', objection);

    res.json({ objection });

  } catch (err) {
    console.error('Create objection error:', err);
    res.status(500).json({ error: 'Failed to create objection' });
  }
});

router.put('/objections/:id', async (req, res) => {
  try {
    const { teamId, userId } = req.user;
    const { id } = req.params;
    const { name, category, variations, win_rate, difficulty, frequency, rank, responses, warning, danger_combo, is_active } = req.body;

    // Save version for rollback
    const existing = await db.getOne('SELECT * FROM objections WHERE id = $1 AND team_id = $2', [id, teamId]);
    if (existing) {
      await db.query(
        'INSERT INTO content_versions (table_name, record_id, previous_data, changed_by) VALUES ($1, $2, $3, $4)',
        ['objections', id, JSON.stringify(existing), userId]
      );
    }

    const result = await db.query(
      `UPDATE objections SET
        name = COALESCE($1, name),
        category = COALESCE($2, category),
        variations = COALESCE($3, variations),
        win_rate = COALESCE($4, win_rate),
        difficulty = COALESCE($5, difficulty),
        frequency = COALESCE($6, frequency),
        rank = COALESCE($7, rank),
        responses = COALESCE($8, responses),
        warning = $9,
        danger_combo = $10,
        is_active = COALESCE($11, is_active),
        updated_at = NOW()
       WHERE id = $12 AND team_id = $13
       RETURNING *`,
      [name, category, variations, win_rate, difficulty, frequency, rank,
       responses ? JSON.stringify(responses) : null, warning,
       danger_combo ? JSON.stringify(danger_combo) : null, is_active, id, teamId]
    );

    const objection = result.rows[0];

    if (!objection) {
      return res.status(404).json({ error: 'Objection not found' });
    }

    // Broadcast update to all connected clients
    broadcastToTeam(teamId, 'content:objection:updated', objection);

    res.json({ objection });

  } catch (err) {
    console.error('Update objection error:', err);
    res.status(500).json({ error: 'Failed to update objection' });
  }
});

router.delete('/objections/:id', async (req, res) => {
  try {
    const { teamId } = req.user;
    const { id } = req.params;

    // Soft delete
    await db.query(
      'UPDATE objections SET is_active = FALSE, updated_at = NOW() WHERE id = $1 AND team_id = $2',
      [id, teamId]
    );

    // Broadcast deletion
    broadcastToTeam(teamId, 'content:objection:deleted', { id });

    res.json({ success: true });

  } catch (err) {
    console.error('Delete objection error:', err);
    res.status(500).json({ error: 'Failed to delete objection' });
  }
});

// ============ PLAYBOOKS CRUD ============

router.get('/playbooks', async (req, res) => {
  try {
    const { teamId } = req.user;
    const playbooks = await db.getAll(
      'SELECT * FROM playbooks WHERE team_id = $1 ORDER BY author, phase',
      [teamId]
    );
    res.json({ playbooks });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch playbooks' });
  }
});

router.post('/playbooks', async (req, res) => {
  try {
    const { teamId } = req.user;
    const { author, phase, name, description, content, duration_minutes } = req.body;

    const result = await db.query(
      `INSERT INTO playbooks (team_id, author, phase, name, description, content, duration_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [teamId, author, phase, name, description, JSON.stringify(content), duration_minutes]
    );

    const playbook = result.rows[0];
    broadcastToTeam(teamId, 'content:playbook:created', playbook);

    res.json({ playbook });

  } catch (err) {
    console.error('Create playbook error:', err);
    res.status(500).json({ error: 'Failed to create playbook' });
  }
});

router.put('/playbooks/:id', async (req, res) => {
  try {
    const { teamId, userId } = req.user;
    const { id } = req.params;
    const { author, phase, name, description, content, duration_minutes, is_active } = req.body;

    const result = await db.query(
      `UPDATE playbooks SET
        author = COALESCE($1, author),
        phase = COALESCE($2, phase),
        name = COALESCE($3, name),
        description = $4,
        content = COALESCE($5, content),
        duration_minutes = $6,
        is_active = COALESCE($7, is_active),
        updated_at = NOW()
       WHERE id = $8 AND team_id = $9
       RETURNING *`,
      [author, phase, name, description, content ? JSON.stringify(content) : null,
       duration_minutes, is_active, id, teamId]
    );

    const playbook = result.rows[0];

    if (!playbook) {
      return res.status(404).json({ error: 'Playbook not found' });
    }

    broadcastToTeam(teamId, 'content:playbook:updated', playbook);
    res.json({ playbook });

  } catch (err) {
    res.status(500).json({ error: 'Failed to update playbook' });
  }
});

router.delete('/playbooks/:id', async (req, res) => {
  try {
    const { teamId } = req.user;
    const { id } = req.params;

    await db.query(
      'UPDATE playbooks SET is_active = FALSE, updated_at = NOW() WHERE id = $1 AND team_id = $2',
      [id, teamId]
    );

    broadcastToTeam(teamId, 'content:playbook:deleted', { id });
    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: 'Failed to delete playbook' });
  }
});

// ============ TESTIMONIALS CRUD ============

router.get('/testimonials', async (req, res) => {
  try {
    const { teamId } = req.user;
    const testimonials = await db.getAll(
      'SELECT * FROM testimonials WHERE team_id = $1 ORDER BY name',
      [teamId]
    );
    res.json({ testimonials });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch testimonials' });
  }
});

router.post('/testimonials', async (req, res) => {
  try {
    const { teamId } = req.user;
    const { name, title, business_name, location, previous_experience, timeline, quote, results, tags, objection_counters } = req.body;

    const result = await db.query(
      `INSERT INTO testimonials (team_id, name, title, business_name, location, previous_experience, timeline, quote, results, tags, objection_counters)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [teamId, name, title, business_name, location, previous_experience, timeline, quote,
       JSON.stringify(results || {}), tags || [], objection_counters || []]
    );

    const testimonial = result.rows[0];
    broadcastToTeam(teamId, 'content:testimonial:created', testimonial);

    res.json({ testimonial });

  } catch (err) {
    console.error('Create testimonial error:', err);
    res.status(500).json({ error: 'Failed to create testimonial' });
  }
});

router.put('/testimonials/:id', async (req, res) => {
  try {
    const { teamId } = req.user;
    const { id } = req.params;
    const { name, title, business_name, location, previous_experience, timeline, quote, results, tags, objection_counters, is_active } = req.body;

    const result = await db.query(
      `UPDATE testimonials SET
        name = COALESCE($1, name),
        title = $2,
        business_name = $3,
        location = $4,
        previous_experience = $5,
        timeline = $6,
        quote = COALESCE($7, quote),
        results = COALESCE($8, results),
        tags = COALESCE($9, tags),
        objection_counters = COALESCE($10, objection_counters),
        is_active = COALESCE($11, is_active),
        updated_at = NOW()
       WHERE id = $12 AND team_id = $13
       RETURNING *`,
      [name, title, business_name, location, previous_experience, timeline, quote,
       results ? JSON.stringify(results) : null, tags, objection_counters, is_active, id, teamId]
    );

    const testimonial = result.rows[0];

    if (!testimonial) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }

    broadcastToTeam(teamId, 'content:testimonial:updated', testimonial);
    res.json({ testimonial });

  } catch (err) {
    res.status(500).json({ error: 'Failed to update testimonial' });
  }
});

router.delete('/testimonials/:id', async (req, res) => {
  try {
    const { teamId } = req.user;
    const { id } = req.params;

    await db.query(
      'UPDATE testimonials SET is_active = FALSE, updated_at = NOW() WHERE id = $1 AND team_id = $2',
      [id, teamId]
    );

    broadcastToTeam(teamId, 'content:testimonial:deleted', { id });
    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: 'Failed to delete testimonial' });
  }
});

// ============ PATTERNS CRUD ============

router.get('/patterns', async (req, res) => {
  try {
    const { teamId } = req.user;
    const patterns = await db.getAll(
      'SELECT * FROM patterns WHERE team_id = $1 ORDER BY priority DESC',
      [teamId]
    );
    res.json({ patterns });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch patterns' });
  }
});

router.post('/patterns', async (req, res) => {
  try {
    const { teamId } = req.user;
    const { type, name, description, trigger_conditions, action_script, win_rate, priority } = req.body;

    const result = await db.query(
      `INSERT INTO patterns (team_id, type, name, description, trigger_conditions, action_script, win_rate, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [teamId, type, name, description, JSON.stringify(trigger_conditions), action_script, win_rate, priority || 0]
    );

    const pattern = result.rows[0];
    broadcastToTeam(teamId, 'content:pattern:created', pattern);

    res.json({ pattern });

  } catch (err) {
    console.error('Create pattern error:', err);
    res.status(500).json({ error: 'Failed to create pattern' });
  }
});

router.put('/patterns/:id', async (req, res) => {
  try {
    const { teamId } = req.user;
    const { id } = req.params;
    const { type, name, description, trigger_conditions, action_script, win_rate, priority, is_active } = req.body;

    const result = await db.query(
      `UPDATE patterns SET
        type = COALESCE($1, type),
        name = COALESCE($2, name),
        description = $3,
        trigger_conditions = COALESCE($4, trigger_conditions),
        action_script = $5,
        win_rate = COALESCE($6, win_rate),
        priority = COALESCE($7, priority),
        is_active = COALESCE($8, is_active),
        updated_at = NOW()
       WHERE id = $9 AND team_id = $10
       RETURNING *`,
      [type, name, description, trigger_conditions ? JSON.stringify(trigger_conditions) : null,
       action_script, win_rate, priority, is_active, id, teamId]
    );

    const pattern = result.rows[0];

    if (!pattern) {
      return res.status(404).json({ error: 'Pattern not found' });
    }

    broadcastToTeam(teamId, 'content:pattern:updated', pattern);
    res.json({ pattern });

  } catch (err) {
    console.error('Update pattern error:', err);
    res.status(500).json({ error: 'Failed to update pattern' });
  }
});

router.delete('/patterns/:id', async (req, res) => {
  try {
    const { teamId } = req.user;
    const { id } = req.params;

    await db.query(
      'UPDATE patterns SET is_active = FALSE, updated_at = NOW() WHERE id = $1 AND team_id = $2',
      [id, teamId]
    );

    broadcastToTeam(teamId, 'content:pattern:deleted', { id });
    res.json({ success: true });

  } catch (err) {
    console.error('Delete pattern error:', err);
    res.status(500).json({ error: 'Failed to delete pattern' });
  }
});

// ============ USERS MANAGEMENT ============

router.get('/users', async (req, res) => {
  try {
    const { teamId } = req.user;
    const users = await db.getAll(
      'SELECT id, email, name, role, is_active, last_login, created_at FROM users WHERE team_id = $1 ORDER BY name',
      [teamId]
    );
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/invitations', async (req, res) => {
  try {
    const { teamId } = req.user;
    const invitations = await db.getAll(
      'SELECT * FROM invitations WHERE team_id = $1 ORDER BY created_at DESC',
      [teamId]
    );
    res.json({ invitations });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

// ============ BROADCAST (Push update to all clients NOW) ============

router.post('/broadcast', async (req, res) => {
  try {
    const { teamId } = req.user;
    const { message } = req.body;

    // Broadcast a refresh signal to all clients
    broadcastToTeam(teamId, 'content:refresh', {
      message: message || 'Content updated',
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, message: 'Broadcast sent' });

  } catch (err) {
    res.status(500).json({ error: 'Failed to broadcast' });
  }
});

export default router;

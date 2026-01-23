/**
 * Content Routes
 * Serves objections, playbooks, testimonials to authenticated clients
 */

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/connection.js';
import { config } from '../config.js';

const router = Router();

// Authentication middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Get all content for the user's team (full sync)
router.get('/sync', authenticate, async (req, res) => {
  try {
    const { teamId } = req.user;
    const { since } = req.query;

    const content = {
      objections: [],
      playbooks: [],
      testimonials: [],
      patterns: [],
      syncedAt: new Date().toISOString()
    };

    // Build queries based on whether this is incremental or full sync
    if (since) {
      // Incremental sync - only items updated since last sync
      content.objections = await db.getAll(
        `SELECT * FROM objections WHERE team_id = $1 AND is_active = TRUE AND updated_at > $2 ORDER BY rank`,
        [teamId, since]
      );
      content.playbooks = await db.getAll(
        `SELECT * FROM playbooks WHERE team_id = $1 AND is_active = TRUE AND updated_at > $2`,
        [teamId, since]
      );
      content.testimonials = await db.getAll(
        `SELECT * FROM testimonials WHERE team_id = $1 AND is_active = TRUE AND updated_at > $2`,
        [teamId, since]
      );
      content.patterns = await db.getAll(
        `SELECT * FROM patterns WHERE team_id = $1 AND is_active = TRUE AND updated_at > $2`,
        [teamId, since]
      );
    } else {
      // Full sync
      content.objections = await db.getAll(
        `SELECT * FROM objections WHERE team_id = $1 AND is_active = TRUE ORDER BY rank`,
        [teamId]
      );
      content.playbooks = await db.getAll(
        `SELECT * FROM playbooks WHERE team_id = $1 AND is_active = TRUE`,
        [teamId]
      );
      content.testimonials = await db.getAll(
        `SELECT * FROM testimonials WHERE team_id = $1 AND is_active = TRUE`,
        [teamId]
      );
      content.patterns = await db.getAll(
        `SELECT * FROM patterns WHERE team_id = $1 AND is_active = TRUE ORDER BY priority DESC`,
        [teamId]
      );
    }

    res.json(content);

  } catch (err) {
    console.error('Content sync error:', err);
    res.status(500).json({ error: 'Failed to sync content' });
  }
});

// Get objections only
router.get('/objections', authenticate, async (req, res) => {
  try {
    const { teamId } = req.user;

    const objections = await db.getAll(
      `SELECT * FROM objections WHERE team_id = $1 AND is_active = TRUE ORDER BY rank`,
      [teamId]
    );

    res.json({ objections });

  } catch (err) {
    console.error('Objections fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch objections' });
  }
});

// Get playbooks only
router.get('/playbooks', authenticate, async (req, res) => {
  try {
    const { teamId } = req.user;

    const playbooks = await db.getAll(
      `SELECT * FROM playbooks WHERE team_id = $1 AND is_active = TRUE`,
      [teamId]
    );

    res.json({ playbooks });

  } catch (err) {
    console.error('Playbooks fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch playbooks' });
  }
});

// Get testimonials only
router.get('/testimonials', authenticate, async (req, res) => {
  try {
    const { teamId } = req.user;

    const testimonials = await db.getAll(
      `SELECT * FROM testimonials WHERE team_id = $1 AND is_active = TRUE`,
      [teamId]
    );

    res.json({ testimonials });

  } catch (err) {
    console.error('Testimonials fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch testimonials' });
  }
});

// Get patterns (danger combos, thresholds)
router.get('/patterns', authenticate, async (req, res) => {
  try {
    const { teamId } = req.user;

    const patterns = await db.getAll(
      `SELECT * FROM patterns WHERE team_id = $1 AND is_active = TRUE ORDER BY priority DESC`,
      [teamId]
    );

    res.json({ patterns });

  } catch (err) {
    console.error('Patterns fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch patterns' });
  }
});

// Get system prompt (pre-built for Gemini)
router.get('/system-prompt', authenticate, async (req, res) => {
  try {
    const { teamId } = req.user;

    // Fetch all content
    const objections = await db.getAll(
      `SELECT * FROM objections WHERE team_id = $1 AND is_active = TRUE ORDER BY rank`,
      [teamId]
    );

    const patterns = await db.getAll(
      `SELECT * FROM patterns WHERE team_id = $1 AND is_active = TRUE ORDER BY priority DESC`,
      [teamId]
    );

    // Build system prompt
    const prompt = buildSystemPrompt(objections, patterns);

    res.json({ prompt, generatedAt: new Date().toISOString() });

  } catch (err) {
    console.error('System prompt generation error:', err);
    res.status(500).json({ error: 'Failed to generate system prompt' });
  }
});

// Build Gemini system prompt from database content
function buildSystemPrompt(objections, patterns) {
  let prompt = `You are a real-time sales coach for VendingPreneurs, helping sales reps close deals for vending machine coaching programs.

## YOUR ROLE
- Listen to the conversation between sales rep and prospect
- Detect objections as they arise
- Provide immediate script suggestions to overcome objections
- Alert on dangerous patterns
- Keep suggestions SHORT - the rep is on a live call

## RESPONSE FORMAT
- OBJECTION: [name]
- SAY THIS: "[script]"
- KEY: [one-liner principle]

## OBJECTION PLAYBOOK
`;

  // Add each objection
  for (const obj of objections) {
    const winRate = obj.win_rate ? `${Math.round(obj.win_rate * 100)}%` : 'N/A';
    prompt += `
### "${obj.name}"
Win Rate: ${winRate} | Difficulty: ${obj.difficulty || 'moderate'}
Variations: ${(obj.variations || []).join(', ')}
`;

    // Add responses
    if (obj.responses) {
      const responses = typeof obj.responses === 'string' ? JSON.parse(obj.responses) : obj.responses;

      if (responses.matt?.primary_script) {
        prompt += `\nSAY THIS (Matt): "${responses.matt.primary_script}"`;
        if (responses.matt.key_principles) {
          prompt += `\nKEY: ${responses.matt.key_principles[0] || ''}`;
        }
      }

      if (responses.scott?.primary_script) {
        prompt += `\nALT (Scott): "${responses.scott.primary_script}"`;
      }
    }

    prompt += '\n';
  }

  // Add danger patterns
  prompt += `\n## DANGER PATTERNS\n`;

  for (const pattern of patterns) {
    prompt += `\n### ${pattern.name}`;
    if (pattern.win_rate) {
      prompt += ` (Win Rate: ${Math.round(pattern.win_rate * 100)}%)`;
    }
    if (pattern.description) {
      prompt += `\n${pattern.description}`;
    }
    if (pattern.action_script) {
      prompt += `\nACTION: ${pattern.action_script}`;
    }
    prompt += '\n';
  }

  prompt += `
## CORE PRINCIPLES
- "Cook their logic" - Find the flaw in their reasoning
- "90% of the time it's a mask" - Dig for the real concern
- "TODAY is the key word" - Create commitment NOW
- "Go back to the Holy Grail" - Tie to their ultimate goal

## REMEMBER
- You are helping a LIVE call - keep it brief
- Scripts should be copy-paste ready
- Flag objections THE MOMENT you hear them
`;

  return prompt;
}

export default router;

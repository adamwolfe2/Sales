/**
 * Database Migration Script
 * Run with: npm run db:migrate
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const migrations = [
  // Teams table
  `CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,

  // Users table
  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    name TEXT,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    role TEXT DEFAULT 'rep' CHECK (role IN ('admin', 'coach', 'rep')),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,

  // Invitations table
  `CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'rep',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'redeemed', 'expired')),
    expires_at TIMESTAMP NOT NULL,
    redeemed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
  )`,

  // Objections table
  `CREATE TABLE IF NOT EXISTS objections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    variations TEXT[] DEFAULT '{}',
    win_rate DECIMAL(3,2),
    difficulty TEXT CHECK (difficulty IN ('favorable', 'moderate', 'challenging')),
    frequency INTEGER DEFAULT 0,
    rank INTEGER,
    responses JSONB DEFAULT '{}',
    sub_objections JSONB DEFAULT '[]',
    warning TEXT,
    danger_combo JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,

  // Playbooks table
  `CREATE TABLE IF NOT EXISTS playbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    author TEXT NOT NULL,
    phase TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    content JSONB NOT NULL,
    duration_minutes INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,

  // Testimonials table
  `CREATE TABLE IF NOT EXISTS testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    title TEXT,
    business_name TEXT,
    location TEXT,
    previous_experience TEXT,
    timeline TEXT,
    quote TEXT NOT NULL,
    results JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    objection_counters TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,

  // Patterns table (danger combos, thresholds)
  `CREATE TABLE IF NOT EXISTS patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    trigger_conditions JSONB NOT NULL,
    action_script TEXT,
    win_rate DECIMAL(3,2),
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  )`,

  // Content versions for rollback
  `CREATE TABLE IF NOT EXISTS content_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    previous_data JSONB NOT NULL,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT NOW()
  )`,

  // Indexes for performance
  `CREATE INDEX IF NOT EXISTS idx_objections_team ON objections(team_id)`,
  `CREATE INDEX IF NOT EXISTS idx_playbooks_team ON playbooks(team_id)`,
  `CREATE INDEX IF NOT EXISTS idx_testimonials_team ON testimonials(team_id)`,
  `CREATE INDEX IF NOT EXISTS idx_patterns_team ON patterns(team_id)`,
  `CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_id)`,
  `CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(code)`,
  `CREATE INDEX IF NOT EXISTS idx_objections_updated ON objections(updated_at)`,
  `CREATE INDEX IF NOT EXISTS idx_playbooks_updated ON playbooks(updated_at)`,
  `CREATE INDEX IF NOT EXISTS idx_testimonials_updated ON testimonials(updated_at)`,
  `CREATE INDEX IF NOT EXISTS idx_patterns_updated ON patterns(updated_at)`
];

async function migrate() {
  console.log('Starting database migration...');

  for (let i = 0; i < migrations.length; i++) {
    try {
      await sql(migrations[i]);
      console.log(`✓ Migration ${i + 1}/${migrations.length} completed`);
    } catch (err) {
      console.error(`✗ Migration ${i + 1} failed:`, err.message);
      // Continue with other migrations
    }
  }

  console.log('Migration complete!');
}

migrate().catch(console.error);

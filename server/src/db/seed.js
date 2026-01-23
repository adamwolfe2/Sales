/**
 * Database Seed Script
 * Imports existing JSON data into the database
 * Run with: npm run db:seed
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// Load JSON data files
function loadJson(filename) {
  try {
    const path = join(__dirname, '../../../data', filename);
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    console.warn(`Could not load ${filename}:`, err.message);
    return null;
  }
}

async function seed() {
  console.log('Starting database seed...');

  // 1. Create default team
  console.log('Creating default team...');
  const teamResult = await sql`
    INSERT INTO teams (name, settings)
    VALUES ('VendingPreneurs', '{"default": true}')
    ON CONFLICT DO NOTHING
    RETURNING id
  `;

  let teamId;
  if (teamResult.length > 0) {
    teamId = teamResult[0].id;
    console.log(`✓ Created team: ${teamId}`);
  } else {
    // Team exists, get its ID
    const existing = await sql`SELECT id FROM teams WHERE name = 'VendingPreneurs'`;
    teamId = existing[0].id;
    console.log(`✓ Using existing team: ${teamId}`);
  }

  // 2. Create admin user
  console.log('Creating admin user...');
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@vendingpreneurs.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await sql`
    INSERT INTO users (email, password_hash, name, team_id, role)
    VALUES (${adminEmail}, ${passwordHash}, 'Admin', ${teamId}, 'admin')
    ON CONFLICT (email) DO UPDATE SET
      password_hash = ${passwordHash},
      team_id = ${teamId},
      role = 'admin'
  `;
  console.log(`✓ Admin user created: ${adminEmail}`);

  // 3. Import objections
  const objectionsData = loadJson('objections.json');
  if (objectionsData && objectionsData.objections) {
    console.log(`Importing ${objectionsData.objections.length} objections...`);

    // Clear existing objections for this team
    await sql`DELETE FROM objections WHERE team_id = ${teamId}`;

    for (const obj of objectionsData.objections) {
      await sql`
        INSERT INTO objections (
          team_id, name, category, variations, win_rate, difficulty,
          frequency, rank, responses, sub_objections, warning, danger_combo
        ) VALUES (
          ${teamId},
          ${obj.name},
          ${obj.category},
          ${obj.variations || []},
          ${obj.win_rate || null},
          ${obj.difficulty || 'moderate'},
          ${obj.frequency || 0},
          ${obj.rank || null},
          ${JSON.stringify(obj.responses || {})},
          ${JSON.stringify(obj.sub_objections || [])},
          ${obj.warning || null},
          ${obj.danger_combo ? JSON.stringify(obj.danger_combo) : null}
        )
      `;
    }
    console.log(`✓ Imported ${objectionsData.objections.length} objections`);
  }

  // 4. Import playbooks
  const playbooksData = loadJson('playbooks.json');
  if (playbooksData && playbooksData.frameworks) {
    console.log('Importing playbooks...');

    // Clear existing playbooks for this team
    await sql`DELETE FROM playbooks WHERE team_id = ${teamId}`;

    let count = 0;
    for (const [authorKey, framework] of Object.entries(playbooksData.frameworks)) {
      if (framework.phases) {
        for (const [phaseKey, phase] of Object.entries(framework.phases)) {
          await sql`
            INSERT INTO playbooks (
              team_id, author, phase, name, description, content, duration_minutes
            ) VALUES (
              ${teamId},
              ${framework.name || authorKey},
              ${phaseKey},
              ${phase.name || phaseKey},
              ${phase.description || null},
              ${JSON.stringify(phase)},
              ${phase.duration_minutes || null}
            )
          `;
          count++;
        }
      }

      // Also import objection frameworks if present
      if (framework.objection_frameworks) {
        for (const [frameworkKey, frameworkContent] of Object.entries(framework.objection_frameworks)) {
          await sql`
            INSERT INTO playbooks (
              team_id, author, phase, name, description, content
            ) VALUES (
              ${teamId},
              ${framework.name || authorKey},
              'objection_handling',
              ${frameworkKey},
              ${frameworkContent.philosophy || null},
              ${JSON.stringify(frameworkContent)}
            )
          `;
          count++;
        }
      }
    }
    console.log(`✓ Imported ${count} playbook entries`);
  }

  // 5. Import testimonials
  const testimonialsData = loadJson('testimonials.json');
  if (testimonialsData && testimonialsData.full_testimonials) {
    console.log(`Importing ${testimonialsData.full_testimonials.length} testimonials...`);

    // Clear existing testimonials for this team
    await sql`DELETE FROM testimonials WHERE team_id = ${teamId}`;

    for (const test of testimonialsData.full_testimonials) {
      await sql`
        INSERT INTO testimonials (
          team_id, name, title, business_name, location,
          previous_experience, timeline, quote, results, tags, objection_counters
        ) VALUES (
          ${teamId},
          ${test.name},
          ${test.title || null},
          ${test.business_name || null},
          ${test.location || null},
          ${test.previous_experience || null},
          ${test.timeline || null},
          ${test.quote},
          ${JSON.stringify(test.results || {})},
          ${test.tags || []},
          ${test.objection_counters || []}
        )
      `;
    }
    console.log(`✓ Imported ${testimonialsData.full_testimonials.length} testimonials`);
  }

  // 6. Import patterns (danger combos, thresholds)
  if (objectionsData && objectionsData.patterns) {
    console.log('Importing patterns...');

    // Clear existing patterns for this team
    await sql`DELETE FROM patterns WHERE team_id = ${teamId}`;

    // Multiple objections pattern
    if (objectionsData.patterns.multiple_objections) {
      const multi = objectionsData.patterns.multiple_objections;

      if (multi.three_plus_objections) {
        await sql`
          INSERT INTO patterns (
            team_id, type, name, description, trigger_conditions, action_script, win_rate, priority
          ) VALUES (
            ${teamId},
            'threshold',
            'Three Objection Threshold',
            'Win rate drops significantly with 3+ objections',
            ${JSON.stringify({ objection_count: { gte: 3 } })},
            ${multi.three_plus_objections.script || null},
            ${multi.three_plus_objections.win_rate || 0.31},
            100
          )
        `;
      }
    }

    // Dangerous combos
    if (objectionsData.patterns.dangerous_combos) {
      for (const combo of objectionsData.patterns.dangerous_combos) {
        await sql`
          INSERT INTO patterns (
            team_id, type, name, description, trigger_conditions, action_script, win_rate, priority
          ) VALUES (
            ${teamId},
            'combo',
            ${`Danger Combo: ${combo.objections.join(' + ')}`},
            'Dangerous objection combination with very low win rate',
            ${JSON.stringify({ objection_categories: combo.objections })},
            ${combo.protocol ? combo.protocol.join('\n') : null},
            ${combo.win_rate || null},
            90
          )
        `;
      }
    }

    console.log('✓ Imported patterns');
  }

  console.log('\n=== Seed complete! ===');
  console.log(`Team ID: ${teamId}`);
  console.log(`Admin login: ${adminEmail}`);
  console.log(`Admin password: ${adminPassword} (change this!)`);
}

seed().catch(console.error);

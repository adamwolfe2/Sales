/**
 * Neon PostgreSQL Connection
 * Uses @neondatabase/serverless for edge-compatible connections
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn('DATABASE_URL not set - using mock database for development');
}

// Create the SQL query function
const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

// Wrapper that matches pg interface for compatibility
export const db = {
  async query(text, params = []) {
    if (!sql) {
      // Mock response for development without DB
      return { rows: [], rowCount: 0 };
    }

    try {
      // Neon's sql function returns rows directly
      const rows = await sql(text, params);
      return { rows, rowCount: rows.length };
    } catch (err) {
      console.error('Database query error:', err);
      throw err;
    }
  },

  // Convenience methods
  async getOne(text, params = []) {
    const result = await this.query(text, params);
    return result.rows[0] || null;
  },

  async getAll(text, params = []) {
    const result = await this.query(text, params);
    return result.rows;
  }
};

export default db;

/**
 * Database migration script
 * Runs the schema SQL against the configured PostgreSQL database.
 * Usage: node database/migrate.js
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');

  if (!fs.existsSync(schemaPath)) {
    console.error('❌ schema.sql not found at', schemaPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(schemaPath, 'utf-8');

  try {
    console.log('🗄️  Running database migrations...');
    await pool.query(sql);
    console.log('✅ Migrations complete!');
  } catch (err) {
    // IF the schema already exists (tables present), this is fine
    if (err.message.includes('already exists')) {
      console.log('ℹ️  Schema already applied — skipping.');
    } else {
      console.error('❌ Migration failed:', err.message);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

migrate();

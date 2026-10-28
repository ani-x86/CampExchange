// run from server/ directory: node scripts/migrate-supabase.cjs
const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MIGRATION_NAME = '20261028000000_init_postgresql';
const sqlPath = path.resolve(__dirname, '../prisma/migrations/' + MIGRATION_NAME + '/migration.sql');
const sql = fs.readFileSync(sqlPath, 'utf-8');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('✅ Connected to Supabase');

  try {
    // Create Prisma migration tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id"                  VARCHAR(36) PRIMARY KEY NOT NULL,
        "checksum"            VARCHAR(64) NOT NULL,
        "finished_at"         TIMESTAMPTZ,
        "migration_name"      VARCHAR(255) NOT NULL,
        "logs"                TEXT,
        "rolled_back_at"      TIMESTAMPTZ,
        "started_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0
      );
    `);

    // Check if already applied
    const { rows } = await client.query(
      `SELECT id FROM "_prisma_migrations" WHERE migration_name = $1`,
      [MIGRATION_NAME]
    );
    if (rows.length > 0) {
      console.log('⏭  Migration already applied — skipping');
      return;
    }

    console.log('▶  Applying migration: ' + MIGRATION_NAME);
    await client.query(sql);

    // Record in tracking table
    await client.query(
      `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count)
       VALUES (gen_random_uuid()::text, 'manual', NOW(), $1, 1)`,
      [MIGRATION_NAME]
    );

    console.log('✅ Migration applied and recorded successfully');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();

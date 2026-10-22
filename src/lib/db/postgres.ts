import { Pool } from "pg";
import { DEFAULT_SURVEY_SCHEMA, SurveySchema } from "../survey/default-schema";

let pool: Pool | null = null;
let initialized = false;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not configured in environment");
    }
    const needsSsl =
      connectionString.includes("sslmode=require") ||
      connectionString.includes("neon.tech") ||
      connectionString.includes("supabase") ||
      connectionString.includes("render.com") ||
      connectionString.includes("railway");
    pool = new Pool({
      connectionString,
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
      max: 10,
    });
  }
  return pool;
}

export async function ensureDatabaseExists(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured in environment");
  }
  const url = new URL(connectionString);
  const dbName = url.pathname.replace(/^\//, "");
  if (!dbName || !/^[a-zA-Z0-9_-]+$/.test(dbName)) {
    return;
  }

  const adminUrl = new URL(connectionString);
  adminUrl.pathname = "/postgres";
  const needsSsl =
    connectionString.includes("sslmode=require") ||
    connectionString.includes("neon.tech") ||
    connectionString.includes("supabase") ||
    connectionString.includes("render.com") ||
    connectionString.includes("railway");

  const adminPool = new Pool({
    connectionString: adminUrl.toString(),
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    max: 2,
  });

  try {
    const check = await adminPool.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );
    if (check.rowCount === 0) {
      await adminPool.query(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await adminPool.end();
  }
}

export async function ensureDbInitialized(): Promise<void> {
  if (initialized) return;
  try {
    const db = getPool();
    await db.query("SELECT 1");
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr && pgErr.code === "3D000") {
      if (pool) {
        await pool.end().catch(() => {});
        pool = null;
      }
      await ensureDatabaseExists();
    } else {
      throw err;
    }
  }
  const db = getPool();

  await db.query(`
    CREATE TABLE IF NOT EXISTS mosapro_survey_definitions (
      slug VARCHAR(64) PRIMARY KEY,
      version INTEGER NOT NULL DEFAULT 1,
      schema_json JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS mosapro_survey_responses (
      id SERIAL PRIMARY KEY,
      client_submission_id VARCHAR(128) UNIQUE NOT NULL,
      survey_version INTEGER NOT NULL DEFAULT 1,
      source_platform VARCHAR(32) NOT NULL DEFAULT 'web',
      is_complete BOOLEAN NOT NULL DEFAULT TRUE,
      current_step VARCHAR(16) NOT NULL DEFAULT 'S5',
      region_sanitaria VARCHAR(16) NOT NULL DEFAULT '',
      municipio VARCHAR(128) NOT NULL DEFAULT '',
      main_location VARCHAR(32) NOT NULL DEFAULT '',
      antiguedad VARCHAR(32) NOT NULL DEFAULT '',
      relacion_zonal VARCHAR(32) NOT NULL DEFAULT '',
      interesa_mesa VARCHAR(16) NOT NULL DEFAULT '',
      ofrece_referente VARCHAR(16),
      payload_json JSONB NOT NULL,
      created_at_client TIMESTAMPTZ,
      synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS mosapro_contact_submissions (
      id SERIAL PRIMARY KEY,
      client_submission_id VARCHAR(128) UNIQUE NOT NULL,
      source_platform VARCHAR(32) NOT NULL DEFAULT 'web',
      nombre VARCHAR(200) NOT NULL,
      telefono VARCHAR(120) NOT NULL,
      email VARCHAR(200),
      region_sanitaria VARCHAR(16) NOT NULL,
      municipio VARCHAR(128) NOT NULL,
      organizacion_espacio VARCHAR(255),
      tematicas_interes JSONB NOT NULL DEFAULT '[]'::jsonb,
      ofrece_referente BOOLEAN NOT NULL DEFAULT FALSE,
      horarios JSONB NOT NULL DEFAULT '[]'::jsonb,
      modalidad VARCHAR(32),
      comentarios TEXT,
      created_at_client TIMESTAMPTZ,
      synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS mosapro_users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(200) UNIQUE NOT NULL,
      nombre VARCHAR(200) NOT NULL DEFAULT '',
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(32) NOT NULL DEFAULT 'user',
      is_validated BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  try {
    await db.query(`
      ALTER TABLE mosapro_survey_responses
        ADD COLUMN IF NOT EXISTS is_complete BOOLEAN NOT NULL DEFAULT TRUE;
      ALTER TABLE mosapro_survey_responses
        ADD COLUMN IF NOT EXISTS current_step VARCHAR(16) NOT NULL DEFAULT 'S5';
    `);
  } catch {
    // ignore if locked or already applied
  }

  const existing = await db.query(
    `SELECT slug, version FROM mosapro_survey_definitions WHERE slug = 'relevamiento-principal'`
  );
  if (existing.rowCount === 0) {
    await db.query(
      `INSERT INTO mosapro_survey_definitions (slug, version, schema_json)
       VALUES ($1, $2, $3::jsonb)`,
      [
        "relevamiento-principal",
        DEFAULT_SURVEY_SCHEMA.version,
        JSON.stringify(DEFAULT_SURVEY_SCHEMA),
      ]
    );
  } else if (existing.rows[0].version < DEFAULT_SURVEY_SCHEMA.version) {
    await db.query(
      `UPDATE mosapro_survey_definitions
       SET version = $1, schema_json = $2::jsonb, updated_at = NOW()
       WHERE slug = 'relevamiento-principal'`,
      [DEFAULT_SURVEY_SCHEMA.version, JSON.stringify(DEFAULT_SURVEY_SCHEMA)]
    );
  }

  initialized = true;
}

export async function getActiveSurveySchema(): Promise<SurveySchema> {
  await ensureDbInitialized();
  const db = getPool();
  const res = await db.query(
    `SELECT schema_json, version FROM mosapro_survey_definitions WHERE slug = 'relevamiento-principal'`
  );
  if (res.rowCount && res.rows[0]) {
    const schema = res.rows[0].schema_json as SurveySchema;
    schema.version = res.rows[0].version;
    return schema;
  }
  return DEFAULT_SURVEY_SCHEMA;
}

export async function updateActiveSurveySchema(
  schema: SurveySchema
): Promise<SurveySchema> {
  await ensureDbInitialized();
  const db = getPool();
  const nextVersion = (schema.version || 1) + 1;
  const updatedSchema: SurveySchema = {
    ...schema,
    version: nextVersion,
  };
  await db.query(
    `UPDATE mosapro_survey_definitions
     SET version = $1, schema_json = $2::jsonb, updated_at = NOW()
     WHERE slug = 'relevamiento-principal'`,
    [nextVersion, JSON.stringify(updatedSchema)]
  );
  return updatedSchema;
}

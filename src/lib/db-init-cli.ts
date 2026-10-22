import fs from "fs";
import path from "path";
import { ensureDbInitialized, getActiveSurveySchema, getPool } from "./db/postgres";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

async function main() {
  loadEnv();
  await ensureDbInitialized();
  const schema = await getActiveSurveySchema();
  console.log(
    `Database initialized. Active survey v${schema.version}: ${schema.sections.length} sections, ${schema.themes.length} themes.`
  );
  await getPool().end();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });

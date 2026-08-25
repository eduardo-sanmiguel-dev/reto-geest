import "reflect-metadata";
import dotenv from "dotenv";
import { Client } from "pg";
import { z } from "zod";
import { appDataSource } from "../config/data-source";

dotenv.config();

const dbEnvSchema = z.object({
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive(),
  DB_USERNAME: z.string().min(1),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string().min(1),
});

const parsed = dbEnvSchema.safeParse(process.env);

if (!parsed.success) {
  const message = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid DB environment configuration: ${message}`);
}

const dbEnv = parsed.data;
const escapedDbUser = dbEnv.DB_USERNAME.replace(/"/g, '""');

const resetSchema = async () => {
  const client = new Client({
    host: dbEnv.DB_HOST,
    port: dbEnv.DB_PORT,
    user: dbEnv.DB_USERNAME,
    password: dbEnv.DB_PASSWORD,
    database: dbEnv.DB_NAME,
  });

  await client.connect();

  try {
    await client.query("DROP SCHEMA IF EXISTS public CASCADE;");
    await client.query("CREATE SCHEMA public;");
    await client.query(`GRANT ALL ON SCHEMA public TO "${escapedDbUser}";`);
    await client.query("GRANT ALL ON SCHEMA public TO public;");
  } finally {
    await client.end();
  }
};

const run = async () => {
  await resetSchema();
  console.log("Database schema reset completed.");

  await appDataSource.initialize();

  try {
    const migrations = await appDataSource.runMigrations();
    console.log(`Applied ${migrations.length} migration(s) after reset.`);
  } finally {
    await appDataSource.destroy();
  }
};

run().catch((error) => {
  console.error("Database reset failed", error);
  process.exit(1);
});

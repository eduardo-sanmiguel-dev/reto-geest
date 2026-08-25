import "reflect-metadata";
import { appDataSource } from "../config/data-source";

const run = async () => {
  await appDataSource.initialize();

  try {
    const migrations = await appDataSource.runMigrations();
    if (migrations.length === 0) {
      console.log("No pending migrations.");
    } else {
      console.log(`Applied ${migrations.length} migration(s).`);
      migrations.forEach((migration) => {
        console.log(`- ${migration.name}`);
      });
    }
  } finally {
    await appDataSource.destroy();
  }
};

run().catch((error) => {
  console.error("Migration execution failed", error);
  process.exit(1);
});

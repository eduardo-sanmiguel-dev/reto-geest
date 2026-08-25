import "reflect-metadata";
import { appDataSource } from "./config/data-source";
import { env } from "./config/env";
import { buildApp } from "./app";
import { openApiDocument } from "./docs/openapi";

const start = async () => {
  await appDataSource.initialize();
  await appDataSource.runMigrations();

  const app = buildApp({
    dataSource: appDataSource,
    config: env,
  });

  const { apiReference } = await import("@scalar/express-api-reference");
  app.use(
    "/docs",
    apiReference({
      theme: "kepler",
      spec: {
        content: openApiDocument,
      },
    }),
  );

  app.listen(env.PORT, () => {
    console.log(`API listening on port ${env.PORT}`);
  });
};

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});

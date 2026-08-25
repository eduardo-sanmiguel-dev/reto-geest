import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  apps: [
    {
      name: "geest-ui",
      cwd: __dirname,
      script: "npm",
      args: "run preview -- --host 0.0.0.0 --port 8300",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};

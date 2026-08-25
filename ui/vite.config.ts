import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const envHosts = (env.VITE_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);

  const allowedHosts = Array.from(new Set(["geest-prueba.com", ...envHosts]));

  return {
    plugins: [react()],
    server: {
      port: 5173,
    },
    preview: {
      allowedHosts,
    },
  };
});

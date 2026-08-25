module.exports = {
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

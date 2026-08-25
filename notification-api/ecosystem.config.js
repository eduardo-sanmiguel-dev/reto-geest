module.exports = {
  apps: [
    {
      name: "geest-notify",
      cwd: __dirname,
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};

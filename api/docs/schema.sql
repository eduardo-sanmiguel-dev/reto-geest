-- PostgreSQL schema for GEEST challenge
CREATE TYPE tasks_status_enum AS ENUM ('open', 'archived');
CREATE TYPE idempotency_keys_status_enum AS ENUM ('in_progress', 'completed');

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  "lastName" VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NULL,
  status tasks_status_enum NOT NULL DEFAULT 'open',
  "archivedAt" TIMESTAMPTZ NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE task_assignments (
  id SERIAL PRIMARY KEY,
  "taskId" INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  "userId" INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "completedAt" TIMESTAMPTZ NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("taskId", "userId")
);

CREATE TABLE notification_attempts (
  id SERIAL PRIMARY KEY,
  "taskId" INT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  "attemptNumber" INT NOT NULL,
  "httpStatus" INT NULL,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  "errorMessage" TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE idempotency_keys (
  id SERIAL PRIMARY KEY,
  "idempotencyKey" VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  path VARCHAR(500) NOT NULL,
  "requestHash" VARCHAR(64) NOT NULL,
  status idempotency_keys_status_enum NOT NULL,
  "statusCode" INT NULL,
  "responseBody" TEXT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("idempotencyKey", method, path)
);

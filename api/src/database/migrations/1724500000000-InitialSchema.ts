import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1724500000000 implements MigrationInterface {
  name = "InitialSchema1724500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."tasks_status_enum" AS ENUM('open', 'archived')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."idempotency_keys_status_enum" AS ENUM('in_progress', 'completed')`,
    );

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" SERIAL NOT NULL,
        "name" character varying(120) NOT NULL,
        "lastName" character varying(120) NOT NULL,
        "email" character varying(255) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tasks" (
        "id" SERIAL NOT NULL,
        "title" character varying(255) NOT NULL,
        "description" text,
        "status" "public"."tasks_status_enum" NOT NULL DEFAULT 'open',
        "archivedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tasks_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "task_assignments" (
        "id" SERIAL NOT NULL,
        "taskId" integer NOT NULL,
        "userId" integer NOT NULL,
        "completedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_task_user" UNIQUE ("taskId", "userId"),
        CONSTRAINT "PK_task_assignments_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "notification_attempts" (
        "id" SERIAL NOT NULL,
        "taskId" integer NOT NULL,
        "attemptNumber" integer NOT NULL,
        "httpStatus" integer,
        "success" boolean NOT NULL DEFAULT false,
        "errorMessage" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_attempts_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "idempotency_keys" (
        "id" SERIAL NOT NULL,
        "idempotencyKey" character varying(255) NOT NULL,
        "method" character varying(10) NOT NULL,
        "path" character varying(500) NOT NULL,
        "requestHash" character varying(64) NOT NULL,
        "status" "public"."idempotency_keys_status_enum" NOT NULL,
        "statusCode" integer,
        "responseBody" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_idempotency_scope" UNIQUE ("idempotencyKey", "method", "path"),
        CONSTRAINT "PK_idempotency_keys_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "task_assignments"
      ADD CONSTRAINT "FK_task_assignments_task"
      FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "task_assignments"
      ADD CONSTRAINT "FK_task_assignments_user"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "notification_attempts"
      ADD CONSTRAINT "FK_notification_attempts_task"
      FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notification_attempts" DROP CONSTRAINT "FK_notification_attempts_task"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_assignments" DROP CONSTRAINT "FK_task_assignments_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_assignments" DROP CONSTRAINT "FK_task_assignments_task"`,
    );

    await queryRunner.query(`DROP TABLE "idempotency_keys"`);
    await queryRunner.query(`DROP TABLE "notification_attempts"`);
    await queryRunner.query(`DROP TABLE "task_assignments"`);
    await queryRunner.query(`DROP TABLE "tasks"`);
    await queryRunner.query(`DROP TABLE "users"`);

    await queryRunner.query(
      `DROP TYPE "public"."idempotency_keys_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."tasks_status_enum"`);
  }
}

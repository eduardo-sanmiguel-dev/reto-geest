import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

export enum IdempotencyStatus {
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
}

@Entity("idempotency_keys")
@Unique(["idempotencyKey", "method", "path"])
export class IdempotencyKeyRecord {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  idempotencyKey!: string;

  @Column({ type: "varchar", length: 10 })
  method!: string;

  @Column({ type: "varchar", length: 500 })
  path!: string;

  @Column({ type: "varchar", length: 64 })
  requestHash!: string;

  @Column({ type: "enum", enum: IdempotencyStatus })
  status!: IdempotencyStatus;

  @Column({ type: "int", nullable: true })
  statusCode!: number | null;

  @Column({ type: "text", nullable: true })
  responseBody!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}

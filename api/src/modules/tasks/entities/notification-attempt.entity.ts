import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Task } from "./task.entity";

@Entity("notification_attempts")
export class NotificationAttempt {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int" })
  taskId!: number;

  @Column({ type: "int" })
  attemptNumber!: number;

  @Column({ type: "int", nullable: true })
  httpStatus!: number | null;

  @Column({ type: "boolean", default: false })
  success!: boolean;

  @Column({ type: "text", nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @ManyToOne(() => Task, (task) => task.notificationAttempts, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "taskId" })
  task!: Task;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { NotificationAttempt } from "./notification-attempt.entity";
import { TaskAssignment } from "./task-assignment.entity";

export enum TaskStatus {
  OPEN = "open",
  ARCHIVED = "archived",
}

@Entity("tasks")
export class Task {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({ type: "enum", enum: TaskStatus, default: TaskStatus.OPEN })
  status!: TaskStatus;

  @Column({ type: "timestamptz", nullable: true })
  archivedAt!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;

  @OneToMany(() => TaskAssignment, (assignment) => assignment.task)
  assignments!: TaskAssignment[];

  @OneToMany(() => NotificationAttempt, (attempt) => attempt.task)
  notificationAttempts!: NotificationAttempt[];
}

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { User } from "../../users/entities";
import { Task } from "./task.entity";

@Entity("task_assignments")
@Unique(["taskId", "userId"])
export class TaskAssignment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "int" })
  taskId!: number;

  @Column({ type: "int" })
  userId!: number;

  @Column({ type: "timestamptz", nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @ManyToOne(() => Task, (task) => task.assignments, { onDelete: "CASCADE" })
  @JoinColumn({ name: "taskId" })
  task!: Task;

  @ManyToOne(() => User, (user) => user.assignments, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { TaskAssignment } from "../../tasks/entities";

@Entity("users")
@Unique(["email"])
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 120 })
  name!: string;

  @Column({ type: "varchar", length: 120 })
  lastName!: string;

  @Column({ type: "varchar", length: 255 })
  email!: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @OneToMany(() => TaskAssignment, (assignment) => assignment.user)
  assignments!: TaskAssignment[];
}

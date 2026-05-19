import { User } from "../entities/User";

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User>;
  update(id: string, data: Partial<Omit<User, "id" | "createdAt" | "updatedAt">>): Promise<User>;
  list(): Promise<User[]>;
}

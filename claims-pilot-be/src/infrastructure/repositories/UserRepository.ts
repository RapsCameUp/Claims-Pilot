import { pool } from "../database/pool";
import { User } from "../../domain/entities/User";
import { IUserRepository } from "../../domain/repositories/IUserRepository";

export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE id = $1",
      [id]
    );
    return rows.length ? this.mapRow(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email.toLowerCase()]
    );
    return rows.length ? this.mapRow(rows[0]) : null;
  }

  async create(user: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User> {
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user.email.toLowerCase(), user.passwordHash, user.firstName, user.lastName, user.role]
    );
    return this.mapRow(rows[0]);
  }

  async update(id: string, data: Partial<Omit<User, "id" | "createdAt" | "updatedAt">>): Promise<User> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.email) { fields.push(`email = $${idx++}`); values.push(data.email.toLowerCase()); }
    if (data.passwordHash) { fields.push(`password_hash = $${idx++}`); values.push(data.passwordHash); }
    if (data.firstName) { fields.push(`first_name = $${idx++}`); values.push(data.firstName); }
    if (data.lastName) { fields.push(`last_name = $${idx++}`); values.push(data.lastName); }
    if (data.role) { fields.push(`role = $${idx++}`); values.push(data.role); }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await pool.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );
    return this.mapRow(rows[0]);
  }

  async list(): Promise<User[]> {
    const { rows } = await pool.query("SELECT * FROM users ORDER BY created_at DESC");
    return rows.map(this.mapRow);
  }

  private mapRow(row: any): User {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

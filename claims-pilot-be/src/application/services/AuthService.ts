import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../../config";
import { IUserRepository } from "../../domain/repositories/IUserRepository";
import { IAuditLogRepository } from "../../domain/repositories/IAuditLogRepository";
import { Role } from "../../domain/entities/User";

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: Role;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
  };
}

export class AuthService {
  constructor(
    private userRepo: IUserRepository,
    private auditRepo: IAuditLogRepository
  ) {}

  async login(dto: LoginDTO, ipAddress?: string): Promise<AuthResponse> {
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) {
      throw new Error("Invalid email or password");
    }

    const validPassword = await bcrypt.compare(dto.password, user.passwordHash);
    if (!validPassword) {
      throw new Error("Invalid email or password");
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwt.secret as jwt.Secret,
      { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
    );

    await this.auditRepo.create({
      userId: user.id,
      action: "LOGIN",
      entityType: "user",
      entityId: user.id,
      details: { email: user.email },
      ipAddress: ipAddress || null,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async register(dto: RegisterDTO, ipAddress?: string): Promise<AuthResponse> {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) {
      throw new Error("Email already registered");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.userRepo.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role || "adjuster",
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwt.secret as jwt.Secret,
      { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
    );

    await this.auditRepo.create({
      userId: user.id,
      action: "REGISTER",
      entityType: "user",
      entityId: user.id,
      details: { email: user.email, role: user.role },
      ipAddress: ipAddress || null,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new Error("User not found");
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}

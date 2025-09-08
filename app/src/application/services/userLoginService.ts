import { IUserRepository } from "../../domain/repositories/userRepository";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret"; // Usa una variable de entorno segura

export class UserLoginService {
  private userRepository: IUserRepository;

  constructor(userRepository: IUserRepository) {
    this.userRepository = userRepository;
  }

  async login(email: string, password: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) return null;

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return null;

    // Genera el JWT con datos mínimos
    const token = jwt.sign(
      {
        uuid: user.uuid,
        email: user.email,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    return {
      uuid: user.uuid,
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      document: user.document,
      createdAt: user.createdAt,
      token,
    };
  }
}

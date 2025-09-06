import { IUser } from "../../domain/interfaces/IUser";
import { IUserRepository } from "../../domain/repositories/userRepository";

export class UserRegisterService {
  constructor(private userRepository: IUserRepository) {}

  async register(user: IUser): Promise<void> {
    await this.userRepository.save(user);
  }
}
// En domain/repositories/userRepository.ts
import { IUser } from "../interfaces/IUser";

export interface IUserRepository {
  save(user: IUser): Promise<void>;
  findByEmail(email: string): Promise<IUser | null>;
  findById(document: string): Promise<IUser | null>;
  updateProfileImage(uuid: string, imageUrl: string): Promise<void>;
}

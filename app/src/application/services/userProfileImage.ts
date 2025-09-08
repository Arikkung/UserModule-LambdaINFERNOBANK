import { IUserRepository } from "../../domain/repositories/userRepository";

export class UpdateProfileImageService {
  constructor(private userRepository: IUserRepository) {}

  async execute(uuid: string, imageUrl: string): Promise<void> {
    await this.userRepository.updateProfileImage(uuid, imageUrl);
  }
}

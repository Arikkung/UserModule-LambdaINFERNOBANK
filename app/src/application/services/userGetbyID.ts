import { IUserRepository } from "../../domain/repositories/userRepository";

export class GetUserByIdService {
  constructor(private userRepository: IUserRepository) {}

  async execute(document: string) {
    const user = await this.userRepository.findById(document);

    if (!user) {
      return null;
    }

    return {
      uuid: user.uuid,
      name: user.name,
      lastName: user.lastName,
      email: user.email,
      document: user.document,
      createdAt: user.createdAt,
      profileImageUrl: user.profileImageUrl,
    };
  }
}

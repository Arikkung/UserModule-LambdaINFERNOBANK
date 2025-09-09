import { IUserRepository } from "../../domain/repositories/userRepository";

export class UpdateProfileImageService {
  constructor(private userRepository: IUserRepository) {}

  async execute(
    document: string,
    imageUrl: string
  ): Promise<{ success: boolean; message?: string; user?: any }> {
    try {
      const user = await this.userRepository.findById(document);

      if (!user) {
        return {
          success: false,
          message: "User not found",
        };
      }

      await this.userRepository.updateProfileImage(user.uuid, imageUrl);

      return {
        success: true,
        message: "Profile image updated successfully",
        user: {
          uuid: user.uuid,
          name: user.name,
          lastName: user.lastName,
          email: user.email,
          document: user.document,
          profileImageUrl: imageUrl,
        },
      };
    } catch (error) {
      console.error("Error in UpdateProfileImageService:", error);
      throw error;
    }
  }
}

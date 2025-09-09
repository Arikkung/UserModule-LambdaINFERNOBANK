"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateProfileImageService = void 0;
class UpdateProfileImageService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async execute(document, imageUrl) {
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
        }
        catch (error) {
            console.error("Error in UpdateProfileImageService:", error);
            throw error;
        }
    }
}
exports.UpdateProfileImageService = UpdateProfileImageService;

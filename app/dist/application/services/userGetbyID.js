"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetUserByIdService = void 0;
class GetUserByIdService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async execute(document) {
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
exports.GetUserByIdService = GetUserByIdService;

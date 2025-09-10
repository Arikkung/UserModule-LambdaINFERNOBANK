"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRegisterService = void 0;
class UserRegisterService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async register(user) {
        await this.userRepository.save(user);
    }
}
exports.UserRegisterService = UserRegisterService;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserLoginService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "default_secret"; // Usa una variable de entorno segura
class UserLoginService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async login(email, password) {
        const user = await this.userRepository.findByEmail(email);
        if (!user)
            return null;
        const valid = await bcryptjs_1.default.compare(password, user.password);
        if (!valid)
            return null;
        // Genera el JWT con datos mínimos
        const token = jsonwebtoken_1.default.sign({
            uuid: user.uuid,
            email: user.email,
            name: user.name,
        }, JWT_SECRET, { expiresIn: "2h" });
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
exports.UserLoginService = UserLoginService;

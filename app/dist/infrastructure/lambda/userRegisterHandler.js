"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const uuid_1 = require("uuid");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const userRegisterService_1 = require("../../application/services/userRegisterService");
const dynamoDBClient_1 = require("../db/dynamoDBClient");
const userRegisterService = new userRegisterService_1.UserRegisterService(dynamoDBClient_1.DynamoDBUserRepository);
function isValidEmail(e) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}
const handler = async (event) => {
    try {
        const body = event.body ? JSON.parse(event.body) : null;
        if (!body ||
            typeof body.name !== "string" ||
            typeof body.email !== "string" ||
            typeof body.password !== "string" ||
            typeof body.document !== "string" ||
            !isValidEmail(body.email)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Invalid input" }),
            };
        }
        const hashedPassword = await bcryptjs_1.default.hash(body.password, 10);
        const user = {
            uuid: (0, uuid_1.v4)(),
            name: body.name,
            lastName: body.lastName || "",
            email: body.email.toLowerCase(),
            password: hashedPassword,
            document: body.document,
            createdAt: new Date().toISOString(),
            profileImageUrl: "", // <-- Agrega este campo
        };
        await userRegisterService.register(user);
        return {
            statusCode: 201,
            body: JSON.stringify({
                message: "Usuario registrado exitosamente",
                data: {
                    id: user.uuid,
                    name: user.name,
                    lastName: user.lastName,
                    email: user.email,
                    document: user.document,
                    createdAt: user.createdAt,
                },
            }),
        };
    }
    catch (err) {
        console.error("Handler error:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error" }),
        };
    }
};
exports.handler = handler;

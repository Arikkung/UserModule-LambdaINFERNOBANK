"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const userRegisterService_1 = require("../../application/services/userRegisterService");
const userLoginService_1 = require("../../application/services/userLoginService");
const dynamoDBClient_1 = require("../db/dynamoDBClient");
const client_s3_1 = require("@aws-sdk/client-s3");
const uuid_1 = require("uuid");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const userRegisterService = new userRegisterService_1.UserRegisterService(dynamoDBClient_1.DynamoDBUserRepository);
const userLoginService = new userLoginService_1.UserLoginService(dynamoDBClient_1.DynamoDBUserRepository);
const s3 = new client_s3_1.S3Client({});
const BUCKET = process.env.PROFILE_IMAGES_BUCKET;
function isValidEmail(e) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}
const handler = async (event, context) => {
    const path = event.path;
    const method = event.httpMethod;
    try {
        if (path === "/register" && method === "POST") {
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
                profileImageUrl: "",
            };
            await userRegisterService.register(user);
            return {
                statusCode: 201,
                body: JSON.stringify({
                    message: "Usuario registrado exitosamente",
                    body: user,
                }),
            };
        }
        if (path === "/login" && method === "POST") {
            const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
            if (!body ||
                typeof body.email !== "string" ||
                typeof body.password !== "string" ||
                !isValidEmail(body.email)) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: "Invalid input" }),
                };
            }
            const user = await userLoginService.login(body.email, body.password);
            if (!user) {
                return {
                    statusCode: 401,
                    body: JSON.stringify({ message: "Credenciales inválidas" }),
                };
            }
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "Login exitoso",
                    data: user,
                }),
            };
        }
        if (path === "/profile-image" && method === "POST") {
            const body = event.body ? JSON.parse(event.body) : null;
            const { uuid, imageBase64 } = body || {};
            if (!uuid || !imageBase64) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: "Missing uuid or imageBase64" }),
                };
            }
            const buffer = Buffer.from(imageBase64, "base64");
            const imageName = `profile_${uuid}_${(0, uuid_1.v4)()}.jpg`;
            await s3.send(new client_s3_1.PutObjectCommand({
                Bucket: BUCKET,
                Key: imageName,
                Body: buffer,
                ContentType: "image/jpeg",
                ACL: "public-read",
            }));
            const imageUrl = `https://${BUCKET}.s3.amazonaws.com/${imageName}`;
            await dynamoDBClient_1.DynamoDBUserRepository.updateProfileImage(uuid, imageUrl);
            return {
                statusCode: 200,
                body: JSON.stringify({ message: "Imagen actualizada", imageUrl }),
            };
        }
        return {
            statusCode: 404,
            body: JSON.stringify({ message: "Not Found" }),
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

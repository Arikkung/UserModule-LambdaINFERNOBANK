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
const userGetbyID_1 = require("../../application/services/userGetbyID");
const userProfilePicture_1 = require("../../application/services/userProfilePicture");
const aws_sdk_1 = require("aws-sdk");
const userRegisterService = new userRegisterService_1.UserRegisterService(dynamoDBClient_1.DynamoDBUserRepository);
const userLoginService = new userLoginService_1.UserLoginService(dynamoDBClient_1.DynamoDBUserRepository);
const getUserByIdService = new userGetbyID_1.GetUserByIdService(dynamoDBClient_1.DynamoDBUserRepository);
const updateProfileImageService = new userProfilePicture_1.UpdateProfileImageService(dynamoDBClient_1.DynamoDBUserRepository);
const s3 = new client_s3_1.S3Client({});
const BUCKET = process.env.PROFILE_IMAGES_BUCKET;
const sqs = new aws_sdk_1.SQS();
const CardUrlReq = process.env.CARD_REQUEST_SQS_URL;
const WelcomeNotification = process.env.WELCOME_NOTIFICATION_SQS_URL;
function isValidEmail(e) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}
const handler = async (event, context) => {
    const path = event.path;
    const method = event.httpMethod;
    const pathParameters = event.pathParameters || {};
    console.log("1:", CardUrlReq);
    try {
        console.log("2:", CardUrlReq);
        if (path === "/register" && method === "POST") {
            const body = event.body ? JSON.parse(event.body) : null;
            console.log("3:", CardUrlReq);
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
            console.log("user:", user.uuid);
            if (CardUrlReq) {
                try {
                    const messageData = {
                        UserId: user.uuid,
                        Request: "DEBIT",
                    };
                    const messageBody = JSON.stringify(messageData);
                    console.log("📤 Enviando a SQS - URL:", CardUrlReq);
                    console.log("📦 Mensaje SQS (string):", messageBody);
                    await sqs
                        .sendMessage({
                        QueueUrl: CardUrlReq,
                        MessageBody: messageBody,
                    })
                        .promise();
                }
                catch (sqsError) {
                    console.error("❌ Error enviando mensaje a SQS:", sqsError);
                }
            }
            return {
                statusCode: 201,
                body: JSON.stringify({
                    message: "Usuario registrado exitosamente",
                    body: user,
                }),
            };
        }
        console.log("4:", CardUrlReq);
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
            // ENVÍO DE NOTIFICACIÓN DE LOGIN A TRAVÉS DE SQS
            if (WelcomeNotification) {
                try {
                    const messageData = {
                        uuid: `login-${(0, uuid_1.v4)().substring(0, 8)}`,
                        type: "USER.LOGIN",
                        userEmail: user.email,
                        userId: user.uuid,
                        data: {
                            date: new Date().toISOString(),
                        },
                    };
                    const messageBody = JSON.stringify(messageData);
                    console.log("📤 Enviando notificación de login a SQS - URL:", WelcomeNotification);
                    console.log("📦 Mensaje SQS:", messageBody);
                    await sqs
                        .sendMessage({
                        QueueUrl: WelcomeNotification,
                        MessageBody: messageBody,
                    })
                        .promise();
                    console.log("✅ Notificación de login enviada exitosamente");
                }
                catch (sqsError) {
                    console.error("❌ Error enviando notificación de login a SQS:", sqsError);
                    // No fallar el login si hay error en la notificación
                }
            }
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "Login exitoso",
                    data: user,
                }),
            };
        }
        if (path.startsWith("/profile/") && method === "GET") {
            const document = pathParameters.id || path.split("/")[2];
            if (!document) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: "Document is required" }),
                };
            }
            const user = await getUserByIdService.execute(document);
            if (!user) {
                return {
                    statusCode: 404,
                    body: JSON.stringify({ message: "User not found" }),
                };
            }
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "User retrieved successfully",
                    data: user,
                }),
            };
        }
        if (path.includes("/profile/") && method === "PUT") {
            const userId = event.pathParameters.id;
            const body = event.body ? JSON.parse(event.body) : null;
            if (!userId || !body) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: "Missing user_id or body" }),
                };
            }
            const { address, phone } = body;
            if (!address && !phone) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: "Nothing to update" }),
                };
            }
            await dynamoDBClient_1.DynamoDBUserRepository.updateProfileInfo(userId, address, phone);
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "User updated successfully",
                    updatedFields: { address, phone },
                }),
            };
        }
        if (path.startsWith("/profile/") &&
            path.endsWith("/avatar") &&
            method === "POST") {
            const pathParts = path.split("/");
            const user_id = pathParts[2];
            const body = event.body ? JSON.parse(event.body) : null;
            const { image, fileType } = body || {}; // Cambia aquí
            if (!user_id || !image) {
                // Y aquí
                return {
                    statusCode: 400,
                    body: JSON.stringify({ message: "Missing user_id or image" }),
                };
            }
            if (typeof image !== "string" || !image.startsWith("data:image/")) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        message: "Invalid image format. Expected base64 string",
                    }),
                };
            }
            try {
                const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, "base64");
                if (buffer.length === 0) {
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ message: "Invalid base64 image data" }),
                    };
                }
                // Buscar usuario por document (user_id)
                const user = await dynamoDBClient_1.DynamoDBUserRepository.findById(user_id);
                if (!user) {
                    return {
                        statusCode: 404,
                        body: JSON.stringify({ message: "User not found" }),
                    };
                }
                // Determinar la extensión del archivo basado en fileType o en el data URL
                let extension = "jpg";
                if (fileType) {
                    extension = fileType.split("/")[1]; // extrae "jpeg", "png", etc.
                }
                else if (image.includes("data:image/")) {
                    const match = image.match(/data:image\/(\w+);base64/);
                    if (match && match[1]) {
                        extension = match[1];
                    }
                }
                // Generar nombre de imagen
                const imageName = `avatar_${user_id}_${(0, uuid_1.v4)()}.${extension}`;
                // Determinar ContentType
                const contentType = fileType || `image/${extension}`;
                await s3.send(new client_s3_1.PutObjectCommand({
                    Bucket: BUCKET,
                    Key: imageName,
                    Body: buffer,
                    ContentType: contentType,
                    ACL: "public-read",
                }));
                const imageUrl = `https://${BUCKET}.s3.amazonaws.com/${imageName}`;
                // Actualizar con la URL real
                await dynamoDBClient_1.DynamoDBUserRepository.updateProfileImage(user_id, imageUrl);
                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        message: "Avatar actualizado exitosamente",
                        imageUrl,
                        user: {
                            uuid: user.uuid,
                            name: user.name,
                            lastName: user.lastName,
                            email: user.email,
                            document: user.document,
                            profileImageUrl: imageUrl,
                        },
                    }),
                };
            }
            catch (err) {
                console.log("log uploading avatar image:", err);
                return {
                    statusCode: 500,
                    body: JSON.stringify({ message: "log al subir el avatar" }),
                };
            }
        }
        return {
            statusCode: 404,
            body: JSON.stringify({ message: "Not Found" }),
        };
    }
    catch (err) {
        console.log("Handler log:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server log" }),
        };
    }
};
exports.handler = handler;

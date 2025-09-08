"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const dynamoDBClient_1 = require("../db/dynamoDBClient");
const uuid_1 = require("uuid");
const s3 = new client_s3_1.S3Client({});
const BUCKET = process.env.PROFILE_IMAGES_BUCKET;
const handler = async (event) => {
    try {
        const body = event.body ? JSON.parse(event.body) : null;
        const { uuid, imageBase64 } = body || {};
        if (!uuid || !imageBase64) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Missing uuid or imageBase64" }),
            };
        }
        // Decodifica base64
        const buffer = Buffer.from(imageBase64, "base64");
        // Genera nombre único
        const imageName = `profile_${uuid}_${(0, uuid_1.v4)()}.jpg`;
        // Sube a S3
        await s3.send(new client_s3_1.PutObjectCommand({
            Bucket: BUCKET,
            Key: imageName,
            Body: buffer,
            ContentType: "image/jpeg",
            ACL: "public-read", // Opcional: para acceso público
        }));
        const imageUrl = `https://${BUCKET}.s3.amazonaws.com/${imageName}`;
        // Actualiza DynamoDB con la URL
        await dynamoDBClient_1.DynamoDBUserRepository.updateProfileImage(uuid, imageUrl);
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Imagen actualizada", imageUrl }),
        };
    }
    catch (err) {
        console.error("Profile image error:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error" }),
        };
    }
};
exports.handler = handler;

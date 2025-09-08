"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const userLoginService_1 = require("../../application/services/userLoginService");
const dynamoDBClient_1 = require("../db/dynamoDBClient");
const userLoginService = new userLoginService_1.UserLoginService(dynamoDBClient_1.DynamoDBUserRepository);
function isValidEmail(e) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}
const handler = async (event) => {
    try {
        const body = event.body ? JSON.parse(event.body) : null;
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
    catch (err) {
        console.error("Login handler error:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal Server Error" }),
        };
    }
};
exports.handler = handler;

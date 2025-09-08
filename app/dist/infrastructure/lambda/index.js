"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRegisterService = void 0;
const dynamoDBClient_1 = require("../db/dynamoDBClient");
const userRegisterService_1 = require("../../application/services/userRegisterService");
exports.userRegisterService = new userRegisterService_1.UserRegisterService(dynamoDBClient_1.DynamoDBUserRepository);

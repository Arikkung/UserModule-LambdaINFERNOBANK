import { DynamoDBUserRepository } from "../db/dynamoDBClient";
import { UserRegisterService } from "../../application/services/userRegisterService";

export const userRegisterService = new UserRegisterService(DynamoDBUserRepository);
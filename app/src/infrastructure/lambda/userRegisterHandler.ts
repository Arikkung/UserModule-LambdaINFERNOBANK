import { APIGatewayProxyHandler } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { UserRegisterService } from "../../application/services/userRegisterService";
import { DynamoDBUserRepository } from "../db/dynamoDBClient";


const userRegisterService = new UserRegisterService(DynamoDBUserRepository);

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : null;

    if (
      !body ||
      typeof body.name !== "string" ||
      typeof body.email !== "string" ||
      typeof body.password !== "string" ||
      typeof body.document !== "string" ||
      !isValidEmail(body.email)
    ) {
      return { statusCode: 400, body: JSON.stringify({ message: "Invalid input" }) };
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);

    const user = {
      uuid: uuidv4(),
      name: body.name,
      lastName: body.lastName || "",
      email: body.email.toLowerCase(),
      password: hashedPassword,
      document: body.document,
      createdAt: new Date().toISOString(),
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
  } catch (err: any) {
    console.error("Handler error:", err);
    return { statusCode: 500, body: JSON.stringify({ message: "Internal Server Error" }) };
  }
};

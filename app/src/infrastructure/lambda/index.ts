import { UserRegisterService } from "../../application/services/userRegisterService";
import { UserLoginService } from "../../application/services/userLoginService";
import { DynamoDBUserRepository } from "../db/dynamoDBClient";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

const userRegisterService = new UserRegisterService(DynamoDBUserRepository);
const userLoginService = new UserLoginService(DynamoDBUserRepository);
const s3 = new S3Client({});
const BUCKET = process.env.PROFILE_IMAGES_BUCKET!;

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export const handler = async (event: any, context: any) => {
  const path = event.path;
  const method = event.httpMethod;

  try {
    if (path === "/register" && method === "POST") {
      const body = event.body ? JSON.parse(event.body) : null;
      if (
        !body ||
        typeof body.name !== "string" ||
        typeof body.email !== "string" ||
        typeof body.password !== "string" ||
        typeof body.document !== "string" ||
        !isValidEmail(body.email)
      ) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Invalid input" }),
        };
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
      const body =
        typeof event.body === "string" ? JSON.parse(event.body) : event.body;

      if (
        !body ||
        typeof body.email !== "string" ||
        typeof body.password !== "string" ||
        !isValidEmail(body.email)
      ) {
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

      await DynamoDBUserRepository.updateProfileInfo(userId, address, phone);

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "User updated successfully",
          updatedFields: { address, phone },
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
      const imageName = `profile_${uuid}_${uuidv4()}.jpg`;

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: imageName,
          Body: buffer,
          ContentType: "image/jpeg",
          ACL: "public-read",
        })
      );

      const imageUrl = `https://${BUCKET}.s3.amazonaws.com/${imageName}`;
      await DynamoDBUserRepository.updateProfileImage(uuid, imageUrl);

      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Imagen actualizada", imageUrl }),
      };
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ message: "Not Found" }),
    };
  } catch (err: any) {
    console.error("Handler error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};

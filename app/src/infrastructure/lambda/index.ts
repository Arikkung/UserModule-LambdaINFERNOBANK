import { UserRegisterService } from "../../application/services/userRegisterService";
import { UserLoginService } from "../../application/services/userLoginService";
import { DynamoDBUserRepository } from "../db/dynamoDBClient";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { GetUserByIdService } from "../../application/services/userGetByID";
import { UpdateProfileImageService } from "../../application/services/userProfileImage";

const userRegisterService = new UserRegisterService(DynamoDBUserRepository);
const userLoginService = new UserLoginService(DynamoDBUserRepository);
const getUserByIdService = new GetUserByIdService(DynamoDBUserRepository);
const updateProfileImageService = new UpdateProfileImageService(
  DynamoDBUserRepository
);
const s3 = new S3Client({});
const BUCKET = process.env.PROFILE_IMAGES_BUCKET!;

function isValidEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export const handler = async (event: any, context: any) => {
  const path = event.path;
  const method = event.httpMethod;
  const pathParameters = event.pathParameters || {};

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

    if (path === "/profile-image" && method === "POST") {
      const body = event.body ? JSON.parse(event.body) : null;
      const { uuid, imageBase64 } = body || {};

      if (!uuid || !imageBase64) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Missing uuid or imageBase64" }),
        };
      }

      // Verificar que imageBase64 sea un string válido
      if (
        typeof imageBase64 !== "string" ||
        !imageBase64.startsWith("data:image/")
      ) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            message: "Invalid image format. Expected base64 string",
          }),
        };
      }

      try {
        // Extraer el contenido base64
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        if (buffer.length === 0) {
          return {
            statusCode: 400,
            body: JSON.stringify({ message: "Invalid base64 image data" }),
          };
        }

        // Generar nombre único para la imagen
        const imageName = `profile_${uuid}_${uuidv4()}.jpg`;

        // Subir a S3
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

        // Actualizar DynamoDB usando el servicio
        await updateProfileImageService.execute(uuid, imageUrl);

        return {
          statusCode: 200,
          body: JSON.stringify({
            message: "Imagen actualizada exitosamente",
            imageUrl,
          }),
        };
      } catch (err: any) {
        console.error("Error uploading profile image:", err);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: "Error al subir la imagen" }),
        };
      }
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

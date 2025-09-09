import { UserRegisterService } from "../../application/services/userRegisterService";
import { UserLoginService } from "../../application/services/userLoginService";
import { DynamoDBUserRepository } from "../db/dynamoDBClient";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { GetUserByIdService } from "../../application/services/userGetbyID";
import { UpdateProfileImageService } from "../../application/services/userProfilePicture";

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

      await DynamoDBUserRepository.updateProfileInfo(userId, address, phone);

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "User updated successfully",
          updatedFields: { address, phone },
        }),
      };
    }

    if (
      path.startsWith("/profile/") &&
      path.endsWith("/avatar") &&
      method === "POST"
    ) {
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
        const user = await DynamoDBUserRepository.findById(user_id);

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
        } else if (image.includes("data:image/")) {
          const match = image.match(/data:image\/(\w+);base64/);
          if (match && match[1]) {
            extension = match[1];
          }
        }

        // Generar nombre de imagen
        const imageName = `avatar_${user_id}_${uuidv4()}.${extension}`;

        // Determinar ContentType
        const contentType = fileType || `image/${extension}`;

        await s3.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: imageName,
            Body: buffer,
            ContentType: contentType,
            ACL: "public-read",
          })
        );

        const imageUrl = `https://${BUCKET}.s3.amazonaws.com/${imageName}`;

        // Actualizar con la URL real
        await DynamoDBUserRepository.updateProfileImage(user_id, imageUrl);

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
      } catch (err: any) {
        console.error("Error uploading avatar image:", err);
        return {
          statusCode: 500,
          body: JSON.stringify({ message: "Error al subir el avatar" }),
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

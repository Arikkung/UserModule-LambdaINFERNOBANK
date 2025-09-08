import { DynamoDB } from "aws-sdk";
import { IUser } from "../../domain/interfaces/IUser";

const dynamo = new DynamoDB.DocumentClient();
const USERS_TABLE = process.env.USERS_TABLE;

if (!USERS_TABLE) {
  console.error("USERS_TABLE env var is not set!");
}

export const DynamoDBUserRepository = {
  async save(user: IUser): Promise<void> {
    if (!user.uuid || !user.document) {
      throw new Error("User must have uuid and document.");
    }

    await dynamo
      .put({
        TableName: USERS_TABLE!,
        Item: user,
      })
      .promise();

    console.log("Saved user:", { uuid: user.uuid, email: user.email });
  },

  async findByEmail(email: string): Promise<IUser | null> {
    try {
      const params = {
        TableName: USERS_TABLE!,
        IndexName: "email",
        KeyConditionExpression: "email = :email",
        ExpressionAttributeValues: {
          ":email": email.toLowerCase(),
        },
        Limit: 1,
      };

      const result = await dynamo.query(params).promise();
      return result.Items && result.Items.length > 0
        ? (result.Items[0] as IUser)
        : null;
    } catch (err) {
      console.error("Error querying by email:", err);
      throw err;
    }
  },

  async updateProfileImage(uuid: string, imageUrl: string): Promise<void> {
    try {
      await dynamo
        .update({
          TableName: USERS_TABLE!,
          Key: { uuid },
          UpdateExpression: "set profileImageUrl = :url",
          ExpressionAttributeValues: { ":url": imageUrl },
          ReturnValues: "UPDATED_NEW",
        })
        .promise();

      console.log("Profile image updated for user:", { uuid, imageUrl });
    } catch (err) {
      console.error("Error updating profile image:", err);
      throw err;
    }
  },

  async findById(document: string): Promise<IUser | null> {
    try {
      const params = {
        TableName: USERS_TABLE!,
        IndexName: "document",
        KeyConditionExpression: "document = :document",
        ExpressionAttributeValues: {
          ":document": document.toString(),
        },
        Limit: 1,
      };

      const result = await dynamo.query(params).promise();
      return result.Items && result.Items.length > 0
        ? (result.Items[0] as IUser)
        : null;
    } catch (err) {
      console.error("Error getting user by document:", err);
      throw err;
    }
  },
};

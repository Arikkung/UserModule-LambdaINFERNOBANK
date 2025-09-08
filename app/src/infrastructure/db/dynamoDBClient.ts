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

  async updateProfileInfo(uuid: string, address: string, phone: string): Promise<void> {
    const updateExpressionParts: string[] = [];
    const exprAttrValues: any = {};

    if (address) {
      updateExpressionParts.push("address = :address");
      exprAttrValues[":address"] = address;
    }

    if (phone) {
      updateExpressionParts.push("phone = :phone");
      exprAttrValues[":phone"] = phone;
    }

    if (updateExpressionParts.length === 0) {
      throw new Error("No fields to update");
    }

    const updateExpression = "set " + updateExpressionParts.join(", ");

    await dynamo
      .update({
        TableName: USERS_TABLE!,
        Key: { uuid },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: exprAttrValues,
      })
      .promise();

      console.log("Updated user profile:", { uuid, ...exprAttrValues });
   },

  async updateProfileImage(uuid: string, imageUrl: string): Promise<void> {
    await dynamo
      .update({
        TableName: USERS_TABLE!,
        Key: { uuid },
        UpdateExpression: "set profileImageUrl = :url",
        ExpressionAttributeValues: { ":url": imageUrl },
      })
      .promise();
  },
};

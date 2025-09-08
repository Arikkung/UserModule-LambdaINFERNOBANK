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

    await dynamo.put({
      TableName: USERS_TABLE!,
      Item: user,
    }).promise();

    console.log("Saved user:", { uuid: user.uuid, email: user.email });
  }
};
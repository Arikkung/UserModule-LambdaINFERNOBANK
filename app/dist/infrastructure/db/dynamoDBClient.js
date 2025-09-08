"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamoDBUserRepository = void 0;
const aws_sdk_1 = require("aws-sdk");
const dynamo = new aws_sdk_1.DynamoDB.DocumentClient();
const USERS_TABLE = process.env.USERS_TABLE;
if (!USERS_TABLE) {
    console.error("USERS_TABLE env var is not set!");
}
exports.DynamoDBUserRepository = {
    async save(user) {
        if (!user.uuid || !user.document) {
            throw new Error("User must have uuid and document.");
        }
        await dynamo
            .put({
            TableName: USERS_TABLE,
            Item: user,
        })
            .promise();
        console.log("Saved user:", { uuid: user.uuid, email: user.email });
    },
    async findByEmail(email) {
        try {
            const params = {
                TableName: USERS_TABLE,
                IndexName: "email",
                KeyConditionExpression: "email = :email",
                ExpressionAttributeValues: {
                    ":email": email.toLowerCase(),
                },
                Limit: 1,
            };
            const result = await dynamo.query(params).promise();
            return result.Items && result.Items.length > 0
                ? result.Items[0]
                : null;
        }
        catch (err) {
            console.error("Error querying by email:", err);
            throw err;
        }
    },
    async updateProfileImage(uuid, imageUrl) {
        await dynamo
            .update({
            TableName: USERS_TABLE,
            Key: { uuid },
            UpdateExpression: "set profileImageUrl = :url",
            ExpressionAttributeValues: { ":url": imageUrl },
        })
            .promise();
    },
};

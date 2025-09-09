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
    async findById(document) {
        try {
            const params = {
                TableName: USERS_TABLE,
                IndexName: "document",
                KeyConditionExpression: "document = :document",
                ExpressionAttributeValues: {
                    ":document": document.toString(),
                },
                Limit: 1,
            };
            const result = await dynamo.query(params).promise();
            return result.Items && result.Items.length > 0
                ? result.Items[0]
                : null;
        }
        catch (err) {
            console.error("Error getting user by document:", err);
            throw err;
        }
    },
    async updateProfileImage(document, imageUrl) {
        try {
            const user = await this.findById(document);
            if (!user) {
                throw new Error("User not found");
            }
            await dynamo
                .update({
                TableName: USERS_TABLE,
                Key: {
                    uuid: user.uuid,
                    document: document,
                },
                UpdateExpression: "set profileImageUrl = :url",
                ExpressionAttributeValues: { ":url": imageUrl },
                ReturnValues: "UPDATED_NEW",
            })
                .promise();
        }
        catch (err) {
            console.error("Error updating profile image:", err);
            throw err;
        }
    },
    async updateProfileInfo(document, address, phone) {
        const result = await dynamo
            .scan({
            TableName: USERS_TABLE,
            FilterExpression: "document = :doc",
            ExpressionAttributeValues: { ":doc": document },
        })
            .promise();
        if (!result.Items || result.Items.length === 0) {
            throw new Error("User not found");
        }
        const user = result.Items[0];
        const updateExpressionParts = [];
        const exprAttrValues = {};
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
            TableName: USERS_TABLE,
            Key: { uuid: user.uuid, document: user.document },
            UpdateExpression: updateExpression,
            ExpressionAttributeValues: exprAttrValues,
        })
            .promise();
        console.log("Updated user profile:", { document, ...exprAttrValues });
    },
};

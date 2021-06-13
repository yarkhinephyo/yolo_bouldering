import { Handler } from 'aws-lambda';
import DynamoDB, { AttributeValue, DeleteItemInput } from 'aws-sdk/clients/dynamodb';
import S3, { DeleteObjectRequest } from 'aws-sdk/clients/s3';

import {
  getMiddlewareAddedHandler,
  DeleteRouteEvent,
  deleteRouteSchema,
  JwtPayload,
  getItemFromRouteTable,
} from './common';
import { createHash } from 'crypto';
import jwt_decode from 'jwt-decode';
import createError from 'http-errors';

const dynamoDb = new DynamoDB.DocumentClient();
const s3 = new S3();

const deleteRoute: Handler = async (event: DeleteRouteEvent) => {
  if (
    !process.env['GYM_TABLE_NAME'] ||
    !process.env['ROUTE_TABLE_NAME'] ||
    !process.env['S3_BUCKET_NAME']
  ) {
    throw createError(500, 'Table or Bucket names are not set!');
  }
  const {
    headers: { Authorization },
    queryStringParameters: { createdAt },
  } = event;

  const { username } = (await jwt_decode(Authorization.split(' ')[1])) as JwtPayload;
  const Item = await getItemFromRouteTable(username, createdAt);

  const usernameHash = createHash('sha256').update(username).digest('base64');
  const decodedRouteURL = decodeURIComponent(Item.routeURL as string);
  const deleteObjectRequest: DeleteObjectRequest = {
    Bucket: process.env['S3_BUCKET_NAME'],
    Key: `public/${usernameHash}${decodedRouteURL.split(usernameHash)[1]}`,
  };
  try {
    await s3.deleteObject(deleteObjectRequest).promise();
  } catch (error) {
    throw createError(500, 'S3 deletion failed.' + error.stack);
  }

  const deleteItemInput: DeleteItemInput = {
    TableName: process.env['ROUTE_TABLE_NAME'],
    Key: {
      username: username as AttributeValue,
      createdAt: createdAt as AttributeValue,
    },
  };
  try {
    await dynamoDb.delete(deleteItemInput).promise();
  } catch (error) {
    throw createError(500, 'DB delete operation failed: ' + error.stack);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ Message: 'Delete route success' }),
  };
};

export const handler = getMiddlewareAddedHandler(deleteRoute, deleteRouteSchema);

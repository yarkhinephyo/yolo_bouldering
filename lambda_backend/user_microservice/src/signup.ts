import { Handler } from 'aws-lambda';
import CognitoIdentity, { SignUpRequest } from 'aws-sdk/clients/cognitoidentityserviceprovider';
import { SignupEvent, signupSchema, getMiddlewareAddedHandler } from './common';
import createError from 'http-errors';

const cognitoIdentity = new CognitoIdentity();

const signup: Handler = async (event: SignupEvent) => {
  if (!process.env['COGNITO_CLIENT_ID']) {
    throw createError(400, 'Cognito Client ID is not set');
  }
  const {
    body: { email, name, password },
  } = event;
  const signUpRequest: SignUpRequest = {
    Username: email,
    Password: password,
    UserAttributes: [
      { Name: 'email', Value: email },
      { Name: 'name', Value: name },
    ],
    ClientId: process.env['COGNITO_CLIENT_ID'] || '',
  };
  let response = {};
  try {
    response = await cognitoIdentity.signUp(signUpRequest).promise();
  } catch (error) {
    throw createError(400, 'Error occurred while signing up in Cognito: ' + error.stack);
  }
  return {
    statusCode: 201,
    body: JSON.stringify(response),
  };
};

export const handler = getMiddlewareAddedHandler(signup, signupSchema);
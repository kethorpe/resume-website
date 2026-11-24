import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

let doc: DynamoDBDocumentClient | undefined;

/** One shared DynamoDB client for every store. */
export function getDoc(): DynamoDBDocumentClient {
  doc ??= DynamoDBDocumentClient.from(new DynamoDBClient({}), {
    marshallOptions: { removeUndefinedValues: true },
  });
  return doc;
}

/**
 * Reads a table name from the environment.
 * Locally, an unset name means "use the in-memory fallback" (returns undefined).
 * Inside Lambda, an unset name is a deployment mistake, so it throws instead of
 * silently keeping data in memory where it would vanish.
 */
export function tableFromEnv(envName: string): string | undefined {
  const value = process.env[envName];
  if (value) return value;
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) throw new Error(`${envName} is not set on the Lambda function`);
  return undefined;
}

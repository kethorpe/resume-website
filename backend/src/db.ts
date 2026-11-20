import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

export interface Testimonial {
  id: string;
  message: string;
  role?: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export type NewTestimonial = Omit<Testimonial, "id" | "createdAt">;

export interface Store {
  list(): Promise<Testimonial[]>;
  get(id: string): Promise<Testimonial | undefined>;
  create(input: NewTestimonial): Promise<Testimonial>;
  remove(id: string): Promise<void>;
}

const newest = (a: Testimonial, b: Testimonial) => b.createdAt.localeCompare(a.createdAt);

function memoryStore(): Store {
  const items = new Map<string, Testimonial>();
  return {
    async list() {
      return [...items.values()].sort(newest);
    },
    async get(id) {
      return items.get(id);
    },
    async create(input) {
      const item = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
      items.set(item.id, item);
      return item;
    },
    async remove(id) {
      items.delete(id);
    },
  };
}

function dynamoStore(table: string): Store {
  const doc = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
    marshallOptions: { removeUndefinedValues: true },
  });
  return {
    async list() {
      // A Scan is fine for a personal site; switch to a Query + GSI if this ever grows.
      const out = await doc.send(new ScanCommand({ TableName: table, Limit: 200 }));
      return ((out.Items ?? []) as Testimonial[]).sort(newest);
    },
    async get(id) {
      const out = await doc.send(new GetCommand({ TableName: table, Key: { id } }));
      return out.Item as Testimonial | undefined;
    },
    async create(input) {
      const item: Testimonial = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
      await doc.send(new PutCommand({ TableName: table, Item: item }));
      return item;
    },
    async remove(id) {
      await doc.send(new DeleteCommand({ TableName: table, Key: { id } }));
    },
  };
}

export const store: Store = process.env.TABLE_NAME ? dynamoStore(process.env.TABLE_NAME) : memoryStore();

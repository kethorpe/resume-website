import { randomUUID } from "node:crypto";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, GetCommand, PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getDoc } from "./dynamo";

export type Status = "pending" | "approved";

export interface Testimonial {
  id: string;
  message: string;
  role?: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  /** Missing on entries created before approvals existed; those count as approved. */
  status?: Status;
}

export type NewTestimonial = Omit<Testimonial, "id" | "createdAt" | "status"> & { status: Status };

export interface Store {
  list(): Promise<Testimonial[]>;
  get(id: string): Promise<Testimonial | undefined>;
  create(input: NewTestimonial): Promise<Testimonial>;
  update(id: string, patch: { status: Status }): Promise<Testimonial | undefined>;
  remove(id: string): Promise<void>;
}

export const statusOf = (t: Testimonial): Status => t.status ?? "approved";

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
    async update(id, patch) {
      const existing = items.get(id);
      if (!existing) return undefined;
      const updated = { ...existing, ...patch };
      items.set(id, updated);
      return updated;
    },
    async remove(id) {
      items.delete(id);
    },
  };
}

function dynamoStore(table: string): Store {
  const doc = getDoc();
  return {
    async list() {
      // Scan is fine for a personal site. Follow pagination so nothing is missed,
      // and stop at 1,000 items as a safety valve.
      const items: Testimonial[] = [];
      let startKey: Record<string, unknown> | undefined;
      do {
        const out = await doc.send(new ScanCommand({ TableName: table, ExclusiveStartKey: startKey }));
        items.push(...((out.Items ?? []) as Testimonial[]));
        startKey = out.LastEvaluatedKey;
      } while (startKey && items.length < 1000);
      return items.sort(newest);
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
    async update(id, patch) {
      try {
        const out = await doc.send(
          new UpdateCommand({
            TableName: table,
            Key: { id },
            // "status" is a DynamoDB reserved word, hence the alias.
            UpdateExpression: "SET #s = :s",
            ConditionExpression: "attribute_exists(id)",
            ExpressionAttributeNames: { "#s": "status" },
            ExpressionAttributeValues: { ":s": patch.status },
            ReturnValues: "ALL_NEW",
          }),
        );
        return out.Attributes as Testimonial;
      } catch (err) {
        if (err instanceof ConditionalCheckFailedException) return undefined;
        throw err;
      }
    },
    async remove(id) {
      await doc.send(new DeleteCommand({ TableName: table, Key: { id } }));
    },
  };
}

export const store: Store = process.env.TABLE_NAME ? dynamoStore(process.env.TABLE_NAME) : memoryStore();

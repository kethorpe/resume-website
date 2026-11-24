import type { Request } from "express";

/**
 * Finds the visitor's IP behind CloudFront + API Gateway.
 *
 * CloudFront appends the real viewer IP to X-Forwarded-For. Anything a visitor
 * sends themselves ends up to the LEFT of that, so we only trust the entry
 * CloudFront added. If API Gateway also appended the CloudFront edge IP (which is
 * the request's sourceIp), we drop it first.
 */
export function pickClientIp(xff: string | undefined, sourceIp: string | undefined): string | undefined {
  const hops = (xff ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (hops.length > 0 && sourceIp && hops[hops.length - 1] === sourceIp) hops.pop();
  return hops[hops.length - 1];
}

type WithGateway = Request & {
  apiGateway?: { event?: { requestContext?: { http?: { sourceIp?: string } } } };
};

export function clientIp(req: Request): string {
  const sourceIp = (req as WithGateway).apiGateway?.event?.requestContext?.http?.sourceIp;
  const header = req.headers["x-forwarded-for"];
  const xff = Array.isArray(header) ? header.join(",") : header;
  return pickClientIp(xff, sourceIp) ?? sourceIp ?? req.socket.remoteAddress ?? "unknown";
}

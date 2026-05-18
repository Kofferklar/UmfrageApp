import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { Redis } from "@upstash/redis";
import { APP_VERSION } from "./survey";
import type { ResponsePayload, StoredSurveyResponse } from "./types";

const localDataPath = path.join(process.cwd(), "data", "local-responses.json");
const redisResponsesKey = "gad:survey:responses";

let redisClient: Redis | null = null;

function shouldUseLocalStorage(): boolean {
  return !getRedisEnv().url && !getRedisEnv().token && process.env.NODE_ENV !== "production";
}

function getRedisEnv(): { url?: string; token?: string } {
  return {
    url: process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN,
  };
}

function getRedis(): Redis {
  const { url, token } = getRedisEnv();

  if (!url || !token) {
    throw new Error("Upstash Redis ist nicht konfiguriert.");
  }

  if (!redisClient) {
    redisClient = new Redis({ url, token });
  }

  return redisClient;
}

function createStoredResponse(payload: ResponsePayload): StoredSurveyResponse {
  const submittedAt = new Date();
  const startedAt = new Date(payload.started_at);
  const durationSeconds = Math.max(0, Math.round((submittedAt.getTime() - startedAt.getTime()) / 1000));

  return {
    ...payload,
    id: randomUUID(),
    submitted_at: submittedAt.toISOString(),
    duration_seconds: durationSeconds,
    app_version: APP_VERSION,
  };
}

async function readLocalResponses(): Promise<StoredSurveyResponse[]> {
  try {
    const raw = await readFile(localDataPath, "utf8");
    return JSON.parse(raw) as StoredSurveyResponse[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeLocalResponses(responses: StoredSurveyResponse[]): Promise<void> {
  await mkdir(path.dirname(localDataPath), { recursive: true });
  await writeFile(localDataPath, `${JSON.stringify(responses, null, 2)}\n`, "utf8");
}

export function getStorageMode(): "upstash-redis" | "local-file" {
  return shouldUseLocalStorage() ? "local-file" : "upstash-redis";
}

export async function saveResponse(payload: ResponsePayload): Promise<StoredSurveyResponse> {
  const response = createStoredResponse(payload);

  if (shouldUseLocalStorage()) {
    const responses = await readLocalResponses();
    responses.push(response);
    await writeLocalResponses(responses);
    return response;
  }

  await getRedis().rpush(redisResponsesKey, response);

  return response;
}

export async function getResponses(options: { includePretest?: boolean } = {}): Promise<StoredSurveyResponse[]> {
  if (shouldUseLocalStorage()) {
    const responses = await readLocalResponses();
    return options.includePretest ? responses : responses.filter((response) => !response.is_pretest);
  }

  const responses = await getRedis().lrange<StoredSurveyResponse>(redisResponsesKey, 0, -1);
  return options.includePretest ? responses : responses.filter((response) => !response.is_pretest);
}

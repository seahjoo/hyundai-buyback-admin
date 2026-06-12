import { createSign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { GOOGLE_SERVICE_ACCOUNT_FILE } from "@/lib/sheets/config";

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

const GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token";

const credentialsCache: {
  value?: ServiceAccountCredentials | null;
} = {};

const accessTokenCache = new Map<
  string,
  {
    token: string;
    expiresAt: number;
  }
>();

function getServiceAccountPath() {
  return path.isAbsolute(GOOGLE_SERVICE_ACCOUNT_FILE)
    ? GOOGLE_SERVICE_ACCOUNT_FILE
    : path.join(process.cwd(), GOOGLE_SERVICE_ACCOUNT_FILE);
}

export function loadServiceAccountCredentials() {
  if (credentialsCache.value !== undefined) {
    return credentialsCache.value;
  }

  const inlineCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (inlineCredentials) {
    credentialsCache.value = JSON.parse(inlineCredentials) as ServiceAccountCredentials;
    return credentialsCache.value;
  }

  const credentialsPath = getServiceAccountPath();

  if (!existsSync(credentialsPath)) {
    credentialsCache.value = null;
    return credentialsCache.value;
  }

  credentialsCache.value = JSON.parse(
    readFileSync(credentialsPath, "utf8"),
  ) as ServiceAccountCredentials;
  return credentialsCache.value;
}

function createSignedJwt(credentials: ServiceAccountCredentials, scope: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: credentials.client_email,
    scope,
    aud: credentials.token_uri ?? GOOGLE_TOKEN_URI,
    exp: now + 3600,
    iat: now,
  };

  const base64Url = (value: string) =>
    Buffer.from(value)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");

  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer
    .sign(credentials.private_key, "base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  return `${signingInput}.${signature}`;
}

export async function getGoogleAccessToken(scopes: string[]) {
  const scopeKey = scopes.slice().sort().join(" ");
  const cachedToken = accessTokenCache.get(scopeKey);

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const credentials = loadServiceAccountCredentials();
  if (!credentials) {
    throw new Error("Google service account credentials file is missing.");
  }

  const assertion = createSignedJwt(credentials, scopeKey);
  const response = await fetch(credentials.token_uri ?? GOOGLE_TOKEN_URI, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Google token request failed with status ${response.status}`);
  }

  const json = (await response.json()) as { access_token: string; expires_in: number };
  accessTokenCache.set(scopeKey, {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  });
  return json.access_token;
}

export async function googleApiFetch(
  url: string,
  options: {
    method?: string;
    scopes: string[];
    headers?: Record<string, string>;
    body?: BodyInit;
    responseType?: "json" | "arrayBuffer" | "text";
  },
) {
  const accessToken = await getGoogleAccessToken(options.scopes);
  const response = await fetch(url, {
    method: options.method,
    body: options.body,
    cache: "no-store",
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google API request failed with status ${response.status}: ${text}`);
  }

  if (options.responseType === "arrayBuffer") {
    return response.arrayBuffer();
  }

  if (options.responseType === "text") {
    return response.text();
  }

  return response.json();
}

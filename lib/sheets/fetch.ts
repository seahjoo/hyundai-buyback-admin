import { createSign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  GOOGLE_SHEETS_CREDIT_RAW_CSV_URL,
  GOOGLE_SERVICE_ACCOUNT_FILE,
  GOOGLE_SHEETS_CONFIRMED_CSV_URL,
  GOOGLE_SHEETS_CSV_URL,
  GOOGLE_SHEETS_PRIVATE_SOURCES,
  GOOGLE_SHEETS_USERS_RAW_CSV_URL,
} from "@/lib/sheets/config";

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

interface PrivateSheetSource {
  spreadsheetId: string;
  gid?: number;
  title?: string;
}

type SheetSourceKind = keyof typeof GOOGLE_SHEETS_PRIVATE_SOURCES;

const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
const GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token";
const REQUEST_TIMEOUT_MS = 30_000;

let cachedCredentials: ServiceAccountCredentials | null | undefined;
let cachedAccessToken:
  | {
      token: string;
      expiresAt: number;
    }
  | null
  | undefined;
const cachedSheetTitles = new Map<string, string>();

function getServiceAccountPath() {
  return path.isAbsolute(GOOGLE_SERVICE_ACCOUNT_FILE)
    ? GOOGLE_SERVICE_ACCOUNT_FILE
    : path.join(process.cwd(), GOOGLE_SERVICE_ACCOUNT_FILE);
}

function getPublicUrl(kind: SheetSourceKind) {
  if (kind === "intake") {
    return GOOGLE_SHEETS_CSV_URL;
  }
  if (kind === "confirmed") {
    return GOOGLE_SHEETS_CONFIRMED_CSV_URL;
  }
  if (kind === "creditRaw") {
    return GOOGLE_SHEETS_CREDIT_RAW_CSV_URL;
  }
  return GOOGLE_SHEETS_USERS_RAW_CSV_URL;
}

function getPrivateSource(kind: SheetSourceKind): PrivateSheetSource {
  return GOOGLE_SHEETS_PRIVATE_SOURCES[kind];
}

function escapeCsvCell(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function rowsToCsv(rows: string[][]) {
  return rows.map((row) => row.map((cell) => escapeCsvCell(cell ?? "")).join(",")).join("\n");
}

function loadServiceAccountCredentials() {
  if (cachedCredentials !== undefined) {
    return cachedCredentials;
  }

  const inlineCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (inlineCredentials) {
    cachedCredentials = JSON.parse(inlineCredentials) as ServiceAccountCredentials;
    return cachedCredentials;
  }

  const credentialsPath = getServiceAccountPath();

  if (!existsSync(credentialsPath)) {
    cachedCredentials = null;
    return cachedCredentials;
  }

  const parsed = JSON.parse(readFileSync(credentialsPath, "utf8")) as ServiceAccountCredentials;
  cachedCredentials = parsed;
  return cachedCredentials;
}

function hasPrivateSheetsCredentials() {
  return loadServiceAccountCredentials() !== null;
}

async function fetchPublicCsv(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      Accept: "text/csv,text/plain;q=0.9,*/*;q=0.1",
    },
  });

  if (!response.ok) {
    throw new Error(`CSV fetch failed with status ${response.status}`);
  }

  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";

  if (
    contentType.includes("text/html") ||
    text.trimStart().toLowerCase().startsWith("<!doctype html") ||
    text.trimStart().toLowerCase().startsWith("<html")
  ) {
    throw new Error(
      "Google Sheets returned an HTML access page instead of CSV. Publish the sheet as a public CSV or provide a directly accessible export URL.",
    );
  }

  return text;
}

function createSignedJwt(credentials: ServiceAccountCredentials) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: credentials.client_email,
    scope: GOOGLE_SHEETS_SCOPE,
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

async function getAccessToken() {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }

  const credentials = loadServiceAccountCredentials();
  if (!credentials) {
    throw new Error("Google service account credentials file is missing.");
  }

  const assertion = createSignedJwt(credentials);
  const response = await fetch(credentials.token_uri ?? GOOGLE_TOKEN_URI, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Google token request failed with status ${response.status}`);
  }

  const json = (await response.json()) as { access_token: string; expires_in: number };
  cachedAccessToken = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

async function googleApiFetch(url: string) {
  const accessToken = await getAccessToken();
  const response = await fetch(url, {
    cache: "no-store",
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Sheets API request failed with status ${response.status}: ${text}`);
  }

  return response.json();
}

async function getSheetTitle(source: PrivateSheetSource) {
  if (source.title) {
    return source.title;
  }

  const cacheKey = `${source.spreadsheetId}:${source.gid}`;
  const cachedTitle = cachedSheetTitles.get(cacheKey);
  if (cachedTitle) {
    return cachedTitle;
  }

  const metadata = (await googleApiFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${source.spreadsheetId}?fields=sheets(properties(sheetId,title))`,
  )) as {
    sheets?: Array<{ properties?: { sheetId?: number; title?: string } }>;
  };

  const matchedSheet = metadata.sheets?.find(
    (sheet) => sheet.properties?.sheetId === source.gid,
  );

  if (!matchedSheet?.properties?.title) {
    throw new Error(`Could not find sheet title for gid ${source.gid}.`);
  }

  cachedSheetTitles.set(cacheKey, matchedSheet.properties.title);
  return matchedSheet.properties.title;
}

async function fetchPrivateSheetCsv(source: PrivateSheetSource) {
  const sheetTitle = await getSheetTitle(source);
  const encodedRange = encodeURIComponent(sheetTitle);
  const valuesResponse = (await googleApiFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${source.spreadsheetId}/values/${encodedRange}?majorDimension=ROWS`,
  )) as {
    values?: string[][];
  };

  return rowsToCsv(valuesResponse.values ?? []);
}

export async function fetchSheetsCsv(kind: SheetSourceKind = "intake") {
  if (hasPrivateSheetsCredentials()) {
    return fetchPrivateSheetCsv(getPrivateSource(kind));
  }

  return fetchPublicCsv(getPublicUrl(kind));
}

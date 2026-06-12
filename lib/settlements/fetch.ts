import {
  RELAY_API_COOKIE_HEADER,
  RELAY_BRAND_DOMAIN,
  RELAY_CREDITS_API_BASE_URL,
  RELAY_CREDITS_API_PATH,
  RELAY_CREDITS_QUERY_KEYS,
  SETTLEMENTS_DEFAULT_DATE_TYPE,
  SETTLEMENTS_DEFAULT_PAGE_LIMIT,
} from "@/lib/settlements/config";

export interface RelayCreditsFetchQuery {
  startDate: string;
  endDate: string;
  dateType?: string;
  limit?: number;
}

function buildApiUrl(query: RelayCreditsFetchQuery, page: number) {
  const url = new URL(RELAY_CREDITS_API_PATH, RELAY_CREDITS_API_BASE_URL);
  url.searchParams.set(
    RELAY_CREDITS_QUERY_KEYS.dateType,
    query.dateType ?? SETTLEMENTS_DEFAULT_DATE_TYPE,
  );
  url.searchParams.set(RELAY_CREDITS_QUERY_KEYS.startDate, query.startDate);
  url.searchParams.set(RELAY_CREDITS_QUERY_KEYS.endDate, query.endDate);
  url.searchParams.set(
    RELAY_CREDITS_QUERY_KEYS.limit,
    String(query.limit ?? SETTLEMENTS_DEFAULT_PAGE_LIMIT),
  );
  url.searchParams.set(RELAY_CREDITS_QUERY_KEYS.page, String(page));
  return url.toString();
}

export function resolveRelayCookieHeader(incomingCookieHeader?: string | null) {
  return RELAY_API_COOKIE_HEADER || incomingCookieHeader || "";
}

export async function fetchRelayCreditsPage(
  query: RelayCreditsFetchQuery,
  page: number,
  cookieHeader: string,
) {
  if (!cookieHeader) {
    throw new Error(
      "Relay API session cookie is missing. Set RELAY_API_COOKIE_HEADER on the server or provide a valid forwarded session cookie.",
    );
  }

  const response = await fetch(buildApiUrl(query, page), {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Cookie: cookieHeader,
      "Brand-domain": RELAY_BRAND_DOMAIN,
    },
    signal: AbortSignal.timeout(15000),
  });

  const text = await response.text();
  let payload: unknown = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const info =
      payload && typeof payload === "object" && "info" in payload
        ? String((payload as { info?: unknown }).info ?? "")
        : "";
    throw new Error(
      `Relay credits API failed with status ${response.status}${info ? `: ${info}` : ""}`,
    );
  }

  return payload;
}

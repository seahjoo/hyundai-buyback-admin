import { fetchRelayCreditsPage, type RelayCreditsFetchQuery, resolveRelayCookieHeader } from "@/lib/settlements/fetch";
import { buildSettlementPayload, parseRelayCreditsPage } from "@/lib/settlements/parser";
import type { SettlementDataPayload, SettlementResult } from "@/lib/settlements/types";

export async function getSettlementDataFromRelay(
  query: RelayCreditsFetchQuery,
  incomingCookieHeader?: string | null,
): Promise<SettlementDataPayload> {
  const cookieHeader = resolveRelayCookieHeader(incomingCookieHeader);
  const allRecords = [];
  let page = 1;
  let total = 0;

  while (true) {
    const rawPayload = await fetchRelayCreditsPage(query, page, cookieHeader);
    const parsedPage = parseRelayCreditsPage(rawPayload);
    allRecords.push(...parsedPage.content);
    total = parsedPage.total;

    if (parsedPage.isLast) {
      break;
    }

    page += 1;
  }

  return buildSettlementPayload(allRecords, query.startDate, query.endDate, total);
}

export async function getSettlementDataServer(
  query: RelayCreditsFetchQuery,
  incomingCookieHeader?: string | null,
): Promise<SettlementResult> {
  try {
    const data = await getSettlementDataFromRelay(query, incomingCookieHeader);
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown settlement provider error.",
      meta: {
        sourceLabel: "Relay Credits API via Server Proxy",
      },
    };
  }
}

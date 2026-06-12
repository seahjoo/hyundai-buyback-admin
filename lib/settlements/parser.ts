import {
  RELAY_CREDIT_ATTRIBUTION_FIELDS,
  RELAY_CREDITS_RESPONSE_PATHS,
  RELAY_CREDIT_NEGATIVE_STATUSES,
  RELAY_CREDIT_POSITIVE_STATUSES,
} from "@/lib/settlements/config";
import type {
  PartnerCreditRecord,
  SettlementDataPayload,
} from "@/lib/settlements/types";

interface RelayCreditsPagePayload {
  content: PartnerCreditRecord[];
  page: number;
  total: number;
  isFirst: boolean;
  isLast: boolean;
}

function normalizeStatus(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function toSignedCredit(
  credit: number,
  status: string,
  result: string,
  decreasedDate: string,
  canceledDate: string,
) {
  const normalizedCredit = Math.abs(credit);

  // "차감"은 이미 지급된 건을 다시 차감하는 케이스라서,
  // 원지급 + 차감분을 함께 상쇄하도록 2배를 음수 처리한다.
  if (decreasedDate) {
    return -normalizedCredit * 2;
  }

  // "지급" 상태에서 요청상태가 취소인 케이스는 실제 지급 전에 취소된 것으로 보고
  // 해당 금액만 총액에서 제외한다.
  if (
    canceledDate ||
    RELAY_CREDIT_NEGATIVE_STATUSES.includes(
      status as (typeof RELAY_CREDIT_NEGATIVE_STATUSES)[number],
    )
  ) {
    return -normalizedCredit;
  }

  if (
    RELAY_CREDIT_POSITIVE_STATUSES.includes(
      status as (typeof RELAY_CREDIT_POSITIVE_STATUSES)[number],
    )
  ) {
    return normalizedCredit;
  }

  return normalizedCredit;
}

function getAttributionDate(
  createdAt: string,
  decreasedDate: string,
  canceledDate: string,
) {
  const attributionSource =
    canceledDate || decreasedDate
      ? RELAY_CREDIT_ATTRIBUTION_FIELDS.negative
      : RELAY_CREDIT_ATTRIBUTION_FIELDS.default;

  if (attributionSource === RELAY_CREDITS_RESPONSE_PATHS.createdAt) {
    return normalizeDate(createdAt);
  }

  return normalizeDate(createdAt);
}

function normalizeDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid created_at value: ${value}`);
  }
  return parsed.toISOString();
}

function normalizeDate(value: string) {
  return normalizeDateTime(value).slice(0, 10);
}

export function parseRelayCreditsPage(payload: unknown): RelayCreditsPagePayload {
  if (!payload || typeof payload !== "object") {
    throw new Error("Relay credits response is not an object.");
  }

  const root = payload as Record<string, unknown>;
  const data = root[RELAY_CREDITS_RESPONSE_PATHS.data];

  if (!data || typeof data !== "object") {
    throw new Error("Relay credits response missing data object.");
  }

  const dataRecord = data as Record<string, unknown>;
  const content = dataRecord[RELAY_CREDITS_RESPONSE_PATHS.content];

  if (!Array.isArray(content)) {
    throw new Error("Relay credits response missing data.content array.");
  }

  return {
    content: content.map((item, index) => {
      const row = item as Record<string, unknown>;
      const createdAt = String(row[RELAY_CREDITS_RESPONSE_PATHS.createdAt] ?? "");
      const status = normalizeStatus(row[RELAY_CREDITS_RESPONSE_PATHS.status]);
      const credit = Number(row[RELAY_CREDITS_RESPONSE_PATHS.credit] ?? 0);
      const increasedDate = String(row[RELAY_CREDITS_RESPONSE_PATHS.increasedDate] ?? "");
      const decreasedDate = String(row[RELAY_CREDITS_RESPONSE_PATHS.decreasedDate] ?? "");
      const canceledDate = String(row[RELAY_CREDITS_RESPONSE_PATHS.canceledDate] ?? "");

      return {
        id: String(row[RELAY_CREDITS_RESPONSE_PATHS.creditId] ?? index),
        createdAt: normalizeDateTime(createdAt),
        settlementDate: getAttributionDate(createdAt, decreasedDate, canceledDate),
        status,
        result: String(row[RELAY_CREDITS_RESPONSE_PATHS.result] ?? ""),
        increasedDate,
        decreasedDate,
        canceledDate,
        signedCredit: toSignedCredit(
          credit,
          status,
          String(row[RELAY_CREDITS_RESPONSE_PATHS.result] ?? ""),
          decreasedDate,
          canceledDate,
        ),
        paidCredit: credit,
        currency: "KRW",
        source: "api",
      };
    }),
    page: Number(dataRecord[RELAY_CREDITS_RESPONSE_PATHS.page] ?? 1),
    total: Number(dataRecord[RELAY_CREDITS_RESPONSE_PATHS.total] ?? 0),
    isFirst: Boolean(dataRecord[RELAY_CREDITS_RESPONSE_PATHS.isFirst]),
    isLast: Boolean(dataRecord[RELAY_CREDITS_RESPONSE_PATHS.isLast]),
  };
}

export function buildSettlementPayload(
  records: PartnerCreditRecord[],
  startDate: string,
  endDate: string,
  total: number,
): SettlementDataPayload {
  return {
    records,
    meta: {
      source: "api",
      sourceLabel: "Relay Credits API via Server Proxy",
      minDate: startDate,
      maxDate: endDate,
      totalRows: total,
    },
  };
}

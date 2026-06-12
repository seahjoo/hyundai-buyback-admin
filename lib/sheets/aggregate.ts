import {
  DEFAULT_COLUMN_CANDIDATES,
  GOOGLE_SHEETS_CSV_URL,
  OPTIONAL_COLUMN_CANDIDATES,
  getConfiguredColumnOverrides,
  getConfiguredOptionalColumnOverrides,
} from "@/lib/sheets/config";
import { parseCsv } from "@/lib/sheets/csv";
import { fetchSheetsCsv } from "@/lib/sheets/fetch";
import type {
  ApplicantVisit,
  CanonicalField,
  DailyPurchaseMetrics,
  DashboardMetrics,
  DashboardResult,
  OptionalCanonicalField,
  PurchaseRow,
  ResolvedColumnMap,
  ResolvedOptionalColumnMap,
  SignupRow,
} from "@/lib/sheets/types";

const COMPLETED_STATUS_KEYWORDS = ["매입완료", "검수통과", "통과", "confirmed", "complete"];

const CREDIT_COLUMN_CANDIDATES = {
  itemPackageId: ["패키지id", "패키지 id", "itempackage_id", "item package id"],
  chargeAmount: ["충전금액", "충전 금액", "credit", "confirmed_credit", "amount"],
} as const;

const USER_COLUMN_CANDIDATES = {
  date: ["created_at", "created at", "date", "가입일", "등록일", "일자"],
  pathState: ["path_state", "path state", "가입경로", "가입 경로"],
  branchState: ["branch_state", "branch state", "가입지점", "가입 지점"],
} as const;

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}

function makeHeaderLookup(headers: string[]) {
  return headers.reduce<Record<string, string>>((acc, header) => {
    acc[normalizeHeader(header)] = header;
    return acc;
  }, {});
}

function resolveCandidates(headers: string[], candidates: readonly string[]) {
  const normalizedHeaders = makeHeaderLookup(headers);
  const exactMatch = candidates
    .map((candidate) => normalizedHeaders[normalizeHeader(candidate)])
    .find(Boolean);

  if (exactMatch) {
    return exactMatch;
  }

  return headers.find((header) => {
    const normalizedHeader = normalizeHeader(header);
    return candidates.some((candidate) => normalizedHeader.includes(normalizeHeader(candidate)));
  });
}

function resolveColumnMap(headers: string[]): ResolvedColumnMap {
  const overrides = getConfiguredColumnOverrides();
  const resolved = {} as ResolvedColumnMap;

  (Object.keys(DEFAULT_COLUMN_CANDIDATES) as CanonicalField[]).forEach((field) => {
    const override = overrides[field];
    if (override && headers.includes(override)) {
      resolved[field] = override;
      return;
    }

    const matched = resolveCandidates(headers, DEFAULT_COLUMN_CANDIDATES[field]);
    if (matched) {
      resolved[field] = matched;
      return;
    }

    throw new Error(`Required column not found for "${field}"`);
  });

  return resolved;
}

function resolveOptionalColumnMap(headers: string[]): ResolvedOptionalColumnMap {
  const overrides = getConfiguredOptionalColumnOverrides();
  const resolved: ResolvedOptionalColumnMap = {};

  (Object.keys(OPTIONAL_COLUMN_CANDIDATES) as OptionalCanonicalField[]).forEach((field) => {
    const override = overrides[field];
    if (override && headers.includes(override)) {
      resolved[field] = override;
      return;
    }

    const matched = resolveCandidates(headers, OPTIONAL_COLUMN_CANDIDATES[field]);
    if (matched) {
      resolved[field] = matched;
    }
  });

  return resolved;
}

function toObjects(headers: string[], rows: string[][]) {
  return rows.map((row) =>
    headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = row[index] ?? "";
      return acc;
    }, {}),
  );
}

function normalizeDate(rawValue: string) {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.replace(/\./g, "-").replace(/\//g, "-").replace(/\s+/g, " ").trim();
  const dateOnlyMatch = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function normalizeApplicantId(rawValue: string) {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return "";
  }

  const digitsOnly = trimmed.replace(/\D/g, "");
  return digitsOnly || trimmed.toLowerCase();
}

function parseNumber(rawValue: string) {
  const normalized = rawValue.replace(/[,\s]/g, "").trim();
  if (!normalized) {
    return 0;
  }

  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
}

function isCompletedStatus(value: string) {
  const normalized = normalizeText(value);
  return COMPLETED_STATUS_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function normalizeChannel(value: string) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return "unknown" as const;
  }
  if (normalized.includes("점포") || normalized.includes("오프라인") || normalized.includes("현장")) {
    return "store" as const;
  }
  if (normalized.includes("온라인") || normalized.includes("앱") || normalized.includes("web")) {
    return "online" as const;
  }
  return "unknown" as const;
}

function mapPurchaseRows(
  rawRows: Record<string, string>[],
  columns: ResolvedColumnMap,
  optionalColumns: ResolvedOptionalColumnMap,
): PurchaseRow[] {
  return rawRows
    .map((row) => ({
      date: normalizeDate(row[columns.date]) ?? "",
      itemPackageId: row[columns.itemPackageId]?.trim() ?? "",
      itemId: row[columns.itemId]?.trim() ?? "",
      purchaseStatus: row[columns.purchaseStatus]?.trim() ?? "",
      applicantId: optionalColumns.visitorId
        ? normalizeApplicantId(row[optionalColumns.visitorId] ?? "")
        : "",
      channel: optionalColumns.channel
        ? normalizeChannel(row[optionalColumns.channel] ?? "")
        : "unknown",
      routeCode: optionalColumns.routeCode
        ? normalizeCode(row[optionalColumns.routeCode] ?? "")
        : "",
      storeCode: optionalColumns.storeCode
        ? normalizeCode(row[optionalColumns.storeCode] ?? "")
        : "",
      confirmedCredit: 0,
    }))
    .filter((row) => row.date);
}

function buildPackageCreditMap(csvText: string) {
  const [headers = [], ...rows] = parseCsv(csvText);
  const itemPackageIdColumn = resolveCandidates(headers, CREDIT_COLUMN_CANDIDATES.itemPackageId);
  const chargeAmountColumn = resolveCandidates(headers, CREDIT_COLUMN_CANDIDATES.chargeAmount);

  if (!itemPackageIdColumn || !chargeAmountColumn) {
    throw new Error('credit_raw sheet must include package id and charge amount columns.');
  }

  return toObjects(headers, rows).reduce<Record<string, number>>((acc, row) => {
    const packageId = row[itemPackageIdColumn]?.trim() ?? "";
    if (!packageId) {
      return acc;
    }

    acc[packageId] = (acc[packageId] ?? 0) + parseNumber(row[chargeAmountColumn] ?? "");
    return acc;
  }, {});
}

function buildSignupRows(csvText: string) {
  const [headers = [], ...rows] = parseCsv(csvText);
  const dateColumn = resolveCandidates(headers, USER_COLUMN_CANDIDATES.date);
  const pathStateColumn = resolveCandidates(headers, USER_COLUMN_CANDIDATES.pathState);
  const branchStateColumn = resolveCandidates(headers, USER_COLUMN_CANDIDATES.branchState);

  if (!dateColumn || !pathStateColumn || !branchStateColumn) {
    throw new Error("users_raw sheet must include date, path_state, and branch_state columns.");
  }

  return toObjects(headers, rows)
    .map(
      (row): SignupRow => ({
        date: normalizeDate(row[dateColumn] ?? "") ?? "",
        pathState: normalizeCode(row[pathStateColumn] ?? ""),
        branchState: normalizeCode(row[branchStateColumn] ?? ""),
      }),
    )
    .filter((row) => row.date);
}

function buildSignupCountByDate(signupRows: SignupRow[]) {
  return signupRows.reduce<Record<string, number>>((acc, row) => {
    acc[row.date] = (acc[row.date] ?? 0) + 1;
    return acc;
  }, {});
}

function sortDatesAscending(rows: DailyPurchaseMetrics[]) {
  return [...rows].sort((a, b) => a.date.localeCompare(b.date));
}

function buildDailyMetrics(
  purchaseRows: PurchaseRow[],
  packageCreditByPackageId: Record<string, number>,
  signupCountByDate: Record<string, number>,
): DailyPurchaseMetrics[] {
  const byDate = new Map<
    string,
    {
      packageIds: Set<string>;
      itemIds: Set<string>;
      completedItemIds: Set<string>;
      onlinePackageIds: Set<string>;
      storePackageIds: Set<string>;
      applicantIds: Set<string>;
    }
  >();

  purchaseRows.forEach((row) => {
    const current =
      byDate.get(row.date) ??
      {
        packageIds: new Set<string>(),
        itemIds: new Set<string>(),
        completedItemIds: new Set<string>(),
        onlinePackageIds: new Set<string>(),
        storePackageIds: new Set<string>(),
        applicantIds: new Set<string>(),
      };

    if (row.itemPackageId) {
      current.packageIds.add(row.itemPackageId);
      if (row.routeCode === "OF") {
        current.onlinePackageIds.add(row.itemPackageId);
      }
      if (row.routeCode === "FF") {
        current.storePackageIds.add(row.itemPackageId);
      }
    }

    if (row.itemId) {
      current.itemIds.add(row.itemId);
    }
    if (isCompletedStatus(row.purchaseStatus) && row.itemId) {
      current.completedItemIds.add(row.itemId);
    }
    if (row.applicantId) {
      current.applicantIds.add(row.applicantId);
    }

    byDate.set(row.date, current);
  });

  const dates = new Set<string>([
    ...byDate.keys(),
    ...Object.keys(signupCountByDate),
  ]);

  return sortDatesAscending(
    [...dates].map((date) => {
      const current =
        byDate.get(date) ??
        {
          packageIds: new Set<string>(),
          itemIds: new Set<string>(),
          completedItemIds: new Set<string>(),
          onlinePackageIds: new Set<string>(),
          storePackageIds: new Set<string>(),
          applicantIds: new Set<string>(),
        };

      const purchaseAmount = [...current.packageIds].reduce(
        (sum, packageId) => sum + (packageCreditByPackageId[packageId] ?? 0),
        0,
      );

      return {
        date,
        applicantCount: current.applicantIds.size,
        signupCount: signupCountByDate[date] ?? 0,
        purchaseRequestCount: current.packageIds.size,
        applicationCount: current.itemIds.size,
        completedPurchaseCount: current.completedItemIds.size,
        storeRequestCount: current.storePackageIds.size,
        onlineRequestCount: current.onlinePackageIds.size,
        purchaseAmount,
      };
    }),
  );
}

function buildApplicantVisits(rows: PurchaseRow[]): ApplicantVisit[] {
  return rows
    .filter((row) => row.applicantId)
    .map((row) => ({
      date: row.date,
      applicantId: row.applicantId,
    }));
}

function buildDashboardMetrics(
  dailyRows: DailyPurchaseMetrics[],
  purchaseRows: PurchaseRow[],
  signupRows: SignupRow[],
  packageCreditByPackageId: Record<string, number>,
  applicantVisits: ApplicantVisit[],
): DashboardMetrics {
  const sortedDailyRows = sortDatesAscending(dailyRows);
  const latestDay = sortedDailyRows.at(-1) ?? null;
  const earliestDay = sortedDailyRows[0] ?? null;

  return {
    latestDate: latestDay?.date ?? null,
    minDate: earliestDay?.date ?? null,
    sections: {
      overall: {
        key: "overall",
        title: "더현대바이백 전체",
        description: "일별 신청자수, 가입자수, 매입 전환 흐름을 전체 기준으로 확인합니다.",
        dailyRows: [...sortedDailyRows].reverse(),
      },
    },
    purchaseRows,
    signupRows,
    packageCreditByPackageId,
    applicantVisits,
  };
}

function buildHeaderError(headers: string[], cause: unknown) {
  const message = cause instanceof Error ? cause.message : "Unknown error";
  return `${message}. Check your column mapping or set GOOGLE_SHEET_COLUMN_* env values.`;
}

export async function getDashboardData(): Promise<DashboardResult> {
  try {
    const [intakeCsvText, creditCsvText, usersCsvText] = await Promise.all([
      fetchSheetsCsv("intake"),
      fetchSheetsCsv("creditRaw"),
      fetchSheetsCsv("usersRaw"),
    ]);
    const [headers = [], ...rows] = parseCsv(intakeCsvText);

    if (headers.length === 0) {
      return {
        ok: false,
        error: "CSV is empty.",
        meta: { sourceUrl: GOOGLE_SHEETS_CSV_URL, headers: [] },
      };
    }

    try {
      const resolvedColumns = resolveColumnMap(headers);
      const resolvedOptionalColumns = resolveOptionalColumnMap(headers);
      const rawRows = toObjects(headers, rows);
      const purchaseRows = mapPurchaseRows(rawRows, resolvedColumns, resolvedOptionalColumns);
      const packageCreditByPackageId = buildPackageCreditMap(creditCsvText);
      const signupRows = buildSignupRows(usersCsvText);
      const signupCountByDate = buildSignupCountByDate(signupRows);

      return {
        ok: true,
        data: buildDashboardMetrics(
          buildDailyMetrics(purchaseRows, packageCreditByPackageId, signupCountByDate),
          purchaseRows,
          signupRows,
          packageCreditByPackageId,
          buildApplicantVisits(purchaseRows),
        ),
        meta: {
          sourceUrl: GOOGLE_SHEETS_CSV_URL,
          resolvedColumns,
          resolvedOptionalColumns,
          rowCount: purchaseRows.length,
        },
      };
    } catch (error) {
      return {
        ok: false,
        error: buildHeaderError(headers, error),
        meta: {
          sourceUrl: GOOGLE_SHEETS_CSV_URL,
          headers,
        },
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown fetch error";
    return {
      ok: false,
      error: `Failed to fetch Google Sheets CSV. ${message}`,
      meta: { sourceUrl: GOOGLE_SHEETS_CSV_URL },
    };
  }
}

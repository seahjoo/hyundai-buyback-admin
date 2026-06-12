import {
  CanonicalField,
  ColumnCandidates,
  OptionalCanonicalField,
  OptionalColumnCandidates,
} from "@/lib/sheets/types";

export const GOOGLE_SERVICE_ACCOUNT_FILE =
  process.env.GOOGLE_SERVICE_ACCOUNT_FILE ?? "credentials/google-service-account.json";

export const GOOGLE_SHEETS_CSV_URL =
  process.env.GOOGLE_SHEETS_CSV_URL ??
  "https://docs.google.com/spreadsheets/d/1I50IgTqyOhQwBZv6oeRKAGx9i-OLvxhtjSJLkzAHUGc/gviz/tq?tqx=out:csv&gid=1131119813";

export const GOOGLE_SHEETS_CONFIRMED_CSV_URL =
  process.env.GOOGLE_SHEETS_CONFIRMED_CSV_URL ??
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR44EC0N31EaIEBgHe7Noil2LxRbWePSm5s2fcsaze2BjG1ciaKlDXSfjXoVHLzQX3vVyLGIi4z2ti6/pub?gid=236160086&single=true&output=csv";

export const GOOGLE_SHEETS_CREDIT_RAW_CSV_URL =
  process.env.GOOGLE_SHEETS_CREDIT_RAW_CSV_URL ??
  "https://docs.google.com/spreadsheets/d/1I50IgTqyOhQwBZv6oeRKAGx9i-OLvxhtjSJLkzAHUGc/gviz/tq?tqx=out:csv&sheet=credit_raw";

export const GOOGLE_SHEETS_USERS_RAW_CSV_URL =
  process.env.GOOGLE_SHEETS_USERS_RAW_CSV_URL ??
  "https://docs.google.com/spreadsheets/d/1I50IgTqyOhQwBZv6oeRKAGx9i-OLvxhtjSJLkzAHUGc/gviz/tq?tqx=out:csv&sheet=users_raw";

export const GOOGLE_SHEETS_PRIVATE_SOURCES = {
  intake: {
    spreadsheetId:
      process.env.GOOGLE_SHEETS_INTAKE_SPREADSHEET_ID ??
      "1I50IgTqyOhQwBZv6oeRKAGx9i-OLvxhtjSJLkzAHUGc",
    gid: Number(process.env.GOOGLE_SHEETS_INTAKE_GID ?? "1131119813"),
    title: process.env.GOOGLE_SHEETS_INTAKE_TITLE ?? "item_raw",
  },
  confirmed: {
    spreadsheetId:
      process.env.GOOGLE_SHEETS_CONFIRMED_SPREADSHEET_ID ??
      "1uLyqwopZnGlQ_q6vSVHYumV3ZPrfRnXhiyhPtS1i-nA",
    gid: Number(process.env.GOOGLE_SHEETS_CONFIRMED_GID ?? "236160086"),
  },
  creditRaw: {
    spreadsheetId:
      process.env.GOOGLE_SHEETS_CREDIT_RAW_SPREADSHEET_ID ??
      "1I50IgTqyOhQwBZv6oeRKAGx9i-OLvxhtjSJLkzAHUGc",
    title: process.env.GOOGLE_SHEETS_CREDIT_RAW_TITLE ?? "credit_raw",
  },
  usersRaw: {
    spreadsheetId:
      process.env.GOOGLE_SHEETS_USERS_RAW_SPREADSHEET_ID ??
      "1I50IgTqyOhQwBZv6oeRKAGx9i-OLvxhtjSJLkzAHUGc",
    title: process.env.GOOGLE_SHEETS_USERS_RAW_TITLE ?? "users_raw",
  },
} as const;

export const DEFAULT_COLUMN_CANDIDATES: ColumnCandidates = {
  date: [
    "cr_date",
    "cr date",
    "date",
    "날짜",
    "일자",
    "신청일",
    "매입신청일",
    "등록일",
    "created_at",
    "created at",
    "접수일",
    "request_date",
  ],
  itemPackageId: [
    "itempackage_id",
    "itempackage id",
    "item package id",
    "패키지id",
    "패키지 id",
    "묶음id",
  ],
  itemId: [
    "item_id",
    "item id",
    "상품id",
    "상품 id",
    "아이템id",
    "아이템 id",
  ],
  purchaseStatus: [
    "매입여부",
    "매입 상태",
    "매입상태",
    "검수결과",
    "검수 상태",
    "진행상태",
    "purchase_status",
    "purchase status",
    "status",
  ],
};

export const OPTIONAL_COLUMN_CANDIDATES: OptionalColumnCandidates = {
  visitorId: [
    "customer_id",
    "customer id",
    "user_id",
    "user id",
    "member_id",
    "member id",
    "phone",
    "mobile",
    "휴대폰",
    "휴대폰번호",
    "핸드폰",
    "전화번호",
    "연락처",
    "회원번호",
    "고객번호",
    "신청자id",
  ],
  channel: [
    "접수구분",
    "신청구분",
    "접수채널",
    "신청채널",
    "유입채널",
    "channel",
    "source",
    "inflow",
  ],
  routeCode: [
    "접수경로",
    "route",
    "route_code",
    "route code",
    "path",
  ],
  storeCode: [
    "접수지점",
    "지점코드",
    "store",
    "store_code",
    "store code",
    "branch",
  ],
  confirmedCredit: [
    "confirmed_credit",
    "confirmed credit",
    "매입포인트",
    "매입 포인트",
    "확정포인트",
    "확정 포인트",
  ],
};

const ENV_FIELD_KEYS: Record<CanonicalField, string> = {
  date: "GOOGLE_SHEET_COLUMN_DATE",
  itemPackageId: "GOOGLE_SHEET_COLUMN_ITEMPACKAGE_ID",
  itemId: "GOOGLE_SHEET_COLUMN_ITEM_ID",
  purchaseStatus: "GOOGLE_SHEET_COLUMN_PURCHASE_STATUS",
};

const OPTIONAL_ENV_FIELD_KEYS: Record<OptionalCanonicalField, string> = {
  visitorId: "GOOGLE_SHEET_COLUMN_VISITOR_ID",
  channel: "GOOGLE_SHEET_COLUMN_CHANNEL",
  routeCode: "GOOGLE_SHEET_COLUMN_ROUTE_CODE",
  storeCode: "GOOGLE_SHEET_COLUMN_STORE_CODE",
  confirmedCredit: "GOOGLE_SHEET_COLUMN_CONFIRMED_CREDIT",
};

export function getConfiguredColumnOverrides(): Partial<Record<CanonicalField, string>> {
  return Object.entries(ENV_FIELD_KEYS).reduce<Partial<Record<CanonicalField, string>>>(
    (acc, [field, envKey]) => {
      const value = process.env[envKey];

      if (value) {
        acc[field as CanonicalField] = value;
      }

      return acc;
    },
    {},
  );
}

export function getConfiguredOptionalColumnOverrides(): Partial<
  Record<OptionalCanonicalField, string>
> {
  return Object.entries(OPTIONAL_ENV_FIELD_KEYS).reduce<
    Partial<Record<OptionalCanonicalField, string>>
  >((acc, [field, envKey]) => {
    const value = process.env[envKey];

    if (value) {
      acc[field as OptionalCanonicalField] = value;
    }

    return acc;
  }, {});
}

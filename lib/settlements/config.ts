export const SETTLEMENTS_MIN_DATE = "2025-07-08";
export const SETTLEMENTS_DEFAULT_PAGE_LIMIT = 100;
export const SETTLEMENTS_DEFAULT_DATE_TYPE = "created_at";

export const RELAY_CREDITS_API_BASE_URL =
  process.env.RELAY_CREDITS_API_BASE_URL ?? "https://rtm.the-relay.kr";

export const RELAY_CREDITS_API_PATH =
  process.env.RELAY_CREDITS_API_PATH ?? "/api/v10/credits";

export const RELAY_API_COOKIE_HEADER = process.env.RELAY_API_COOKIE_HEADER ?? "";
export const RELAY_BRAND_DOMAIN = process.env.RELAY_BRAND_DOMAIN ?? "lotte";

export const RELAY_CREDITS_QUERY_KEYS = {
  dateType: "date_type",
  startDate: "start_date",
  endDate: "end_date",
  limit: "limit",
  page: "page",
} as const;

export const RELAY_CREDITS_RESPONSE_PATHS = {
  data: "data",
  content: "content",
  page: "page",
  total: "total",
  isFirst: "is_first",
  isLast: "is_last",
  creditId: "credit_id",
  credit: "credit",
  createdAt: "created_at",
  status: "status",
  result: "result",
  increasedDate: "increased_date",
  decreasedDate: "decreased_date",
  canceledDate: "canceled_date",
} as const;

export const RELAY_CREDIT_POSITIVE_STATUSES = ["add", "rlt"] as const;
export const RELAY_CREDIT_NEGATIVE_STATUSES = ["can", "cancel", "deduct", "dec"] as const;

export const RELAY_CREDIT_ATTRIBUTION_FIELDS = {
  default: "created_at",
  negative: "created_at",
} as const;

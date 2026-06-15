export type CanonicalField =
  | "date"
  | "itemPackageId"
  | "itemId"
  | "purchaseStatus";

export type OptionalCanonicalField =
  | "visitorId"
  | "channel"
  | "routeCode"
  | "storeCode"
  | "confirmedCredit"
  | "itemState"
  | "address";

export type ColumnCandidates = Record<CanonicalField, string[]>;
export type OptionalColumnCandidates = Record<OptionalCanonicalField, string[]>;

export type ResolvedColumnMap = Record<CanonicalField, string>;
export type ResolvedOptionalColumnMap = Partial<Record<OptionalCanonicalField, string>>;

export interface PurchaseRow {
  date: string;
  occurredAt: string;
  itemPackageId: string;
  itemId: string;
  purchaseStatus: string;
  itemState: string;
  applicantId: string;
  channel: "store" | "online" | "unknown";
  routeCode: string;
  storeCode: string;
  address: string;
  confirmedCredit: number;
}

export interface SignupRow {
  date: string;
  pathState: string;
  branchState: string;
  address: string;
}

export interface DailyPurchaseMetrics {
  date: string;
  applicantCount: number;
  signupCount: number;
  purchaseRequestCount: number;
  applicationCount: number;
  completedPurchaseCount: number;
  storeRequestCount: number;
  onlineRequestCount: number;
  purchaseAmount: number;
}

export interface DashboardSection {
  key: "overall" | "popup";
  title: string;
  description: string;
  dailyRows: DailyPurchaseMetrics[];
}

export interface ApplicantVisit {
  date: string;
  applicantId: string;
}

export interface DashboardMetrics {
  latestDate: string | null;
  minDate: string | null;
  sections: {
    overall: DashboardSection;
  };
  purchaseRows: PurchaseRow[];
  signupRows: SignupRow[];
  packageCreditByPackageId: Record<string, number>;
  applicantVisits: ApplicantVisit[];
}

export type DashboardResult =
  | {
      ok: true;
      data: DashboardMetrics;
      meta: {
        sourceUrl: string;
        resolvedColumns: ResolvedColumnMap;
        resolvedOptionalColumns: ResolvedOptionalColumnMap;
        rowCount: number;
      };
    }
  | {
      ok: false;
      error: string;
      meta: {
        sourceUrl: string;
        headers?: string[];
      };
    };

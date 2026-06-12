export interface PartnerCreditRecord {
  id: string;
  createdAt: string;
  settlementDate: string;
  status: string;
  result: string;
  increasedDate: string;
  decreasedDate: string;
  canceledDate: string;
  signedCredit: number;
  paidCredit: number;
  currency: "KRW";
  source: "api";
}

export interface SettlementQuery {
  startDate: string;
  endDate: string;
}

export interface SettlementDataPayload {
  records: PartnerCreditRecord[];
  meta: {
    source: "api";
    sourceLabel: string;
    minDate: string;
    maxDate: string;
    totalRows: number;
  };
}

export interface WeeklySettlementRow {
  weekKey: string;
  weekLabel: string;
  weekStart: string;
  weekEnd: string;
  paidCredit: number;
}

export interface MonthlySettlementRow {
  monthKey: string;
  monthLabel: string;
  paidCredit: number;
}

export interface SettlementSummary {
  totalPaidCredit: number;
  weeklyRows: WeeklySettlementRow[];
  monthlyRows: MonthlySettlementRow[];
}

export type SettlementResult =
  | {
      ok: true;
      data: SettlementDataPayload;
    }
  | {
      ok: false;
      error: string;
      meta: {
        sourceLabel: string;
      };
    };

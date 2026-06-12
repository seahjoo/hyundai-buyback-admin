export interface MonthlySettlementSeed {
  month: string;
  payoutAmount: number;
}

export const MONTHLY_SETTLEMENT_SEEDS: MonthlySettlementSeed[] = [
  { month: "2025-07", payoutAmount: 19539000 },
  { month: "2025-08", payoutAmount: 11375000 },
  { month: "2025-09", payoutAmount: 6591000 },
  { month: "2025-10", payoutAmount: 11085000 },
  { month: "2025-11", payoutAmount: 9570000 },
  { month: "2025-12", payoutAmount: 12100000 },
  { month: "2026-01", payoutAmount: 7040000 },
  { month: "2026-02", payoutAmount: 5380000 },
  { month: "2026-03", payoutAmount: 16287000 },
  { month: "2026-04", payoutAmount: 20096000 },
];

export function getSeedPayoutMap() {
  return Object.fromEntries(
    MONTHLY_SETTLEMENT_SEEDS.map((item) => [item.month, item.payoutAmount]),
  ) as Record<string, number>;
}

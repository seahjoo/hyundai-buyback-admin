import type {
  MonthlySettlementRow,
  PartnerCreditRecord,
  SettlementSummary,
  WeeklySettlementRow,
} from "@/lib/settlements/types";

function formatKoreanMonth(date: string) {
  const [year, month] = date.split("-");
  return `${year}.${month}`;
}

function getWeekRange(input: string) {
  const date = new Date(`${input}T00:00:00`);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() + diffToMonday);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const start = weekStart.toISOString().slice(0, 10);
  const end = weekEnd.toISOString().slice(0, 10);

  return {
    key: `${start}_${end}`,
    start,
    end,
    label: `${start.slice(5)} - ${end.slice(5)}`,
  };
}

export function buildSettlementSummary(
  records: PartnerCreditRecord[],
): SettlementSummary {
  const weeklyMap = new Map<string, WeeklySettlementRow>();
  const monthlyMap = new Map<string, MonthlySettlementRow>();

  records.forEach((record) => {
    const week = getWeekRange(record.settlementDate);
    const currentWeek = weeklyMap.get(week.key) ?? {
      weekKey: week.key,
      weekLabel: week.label,
      weekStart: week.start,
      weekEnd: week.end,
      paidCredit: 0,
    };
    currentWeek.paidCredit += record.signedCredit;
    weeklyMap.set(week.key, currentWeek);

    const monthKey = record.settlementDate.slice(0, 7);
    const currentMonth = monthlyMap.get(monthKey) ?? {
      monthKey,
      monthLabel: formatKoreanMonth(monthKey),
      paidCredit: 0,
    };
    currentMonth.paidCredit += record.signedCredit;
    monthlyMap.set(monthKey, currentMonth);
  });

  return {
    totalPaidCredit: records.reduce((sum, record) => sum + record.signedCredit, 0),
    weeklyRows: [...weeklyMap.values()].sort((a, b) => b.weekStart.localeCompare(a.weekStart)),
    monthlyRows: [...monthlyMap.values()].sort((a, b) => b.monthKey.localeCompare(a.monthKey)),
  };
}

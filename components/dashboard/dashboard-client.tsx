"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SummaryTable } from "@/components/dashboard/summary-table";
import { TrendChart } from "@/components/dashboard/trend-chart";
import type {
  ApplicantVisit,
  DashboardSection,
  DailyPurchaseMetrics,
  PurchaseRow,
  SignupRow,
} from "@/lib/sheets";

interface DashboardClientProps {
  userRole: "partner" | "admin";
  sections: {
    overall: DashboardSection;
  };
  latestDate: string | null;
  minDate: string | null;
  purchaseRows: PurchaseRow[];
  signupRows: SignupRow[];
  packageCreditByPackageId: Record<string, number>;
  applicantVisits: ApplicantVisit[];
}

type Preset = "7d" | "30d" | "all" | "custom";

const POPUP_ROUTE_CODES = new Set(["OF", "FF", "TS", "HP"]);
const NON_POPUP_CODES = new Set(["", "0", "OO"]);
const COMPLETED_STATUS_KEYWORDS = ["매입완료", "검수통과", "통과", "confirmed", "complete"];
const STORE_LABELS: Record<string, string> = {
  TS: "더현대서울",
  HP: "판교점",
};
const POPUP_STORE_CODES = new Set(Object.keys(STORE_LABELS));

function clampDate(value: string, min: string, max: string) {
  if (!value) return value;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function subtractDays(date: string, days: number) {
  const base = new Date(`${date}T00:00:00`);
  base.setDate(base.getDate() - days);
  return base.toISOString().slice(0, 10);
}

function getDateParts(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function buildDate(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getYearOptions(minDate: string, maxDate: string) {
  const minYear = getDateParts(minDate).year;
  const maxYear = getDateParts(maxDate).year;
  return Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index);
}

function getMonthOptions(selectedYear: number, minDate: string, maxDate: string) {
  const min = getDateParts(minDate);
  const max = getDateParts(maxDate);
  const startMonth = selectedYear === min.year ? min.month : 1;
  const endMonth = selectedYear === max.year ? max.month : 12;
  return Array.from({ length: endMonth - startMonth + 1 }, (_, index) => startMonth + index);
}

function getDayOptions(selectedYear: number, selectedMonth: number, minDate: string, maxDate: string) {
  const min = getDateParts(minDate);
  const max = getDateParts(maxDate);
  const startDay =
    selectedYear === min.year && selectedMonth === min.month ? min.day : 1;
  const endDay =
    selectedYear === max.year && selectedMonth === max.month
      ? max.day
      : daysInMonth(selectedYear, selectedMonth);

  return Array.from({ length: endDay - startDay + 1 }, (_, index) => startDay + index);
}

interface DateSelectProps {
  label: string;
  value: string;
  minDate: string;
  maxDate: string;
  onChange: (nextValue: string) => void;
}

function DateSelect({ label, value, minDate, maxDate, onChange }: DateSelectProps) {
  const { year, month, day } = getDateParts(value);
  const yearOptions = getYearOptions(minDate, maxDate);
  const monthOptions = getMonthOptions(year, minDate, maxDate);
  const dayOptions = getDayOptions(year, month, minDate, maxDate);

  return (
    <label className="rounded-[24px] border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600">
      {label}
      <div className="mt-2 grid grid-cols-3 gap-2">
        <select
          value={year}
          onChange={(event) => {
            const nextYear = Number(event.target.value);
            const nextMonth = getMonthOptions(nextYear, minDate, maxDate)[0];
            const nextDay = getDayOptions(nextYear, nextMonth, minDate, maxDate)[0];
            onChange(buildDate(nextYear, nextMonth, nextDay));
          }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none"
        >
          {yearOptions.map((optionYear) => (
            <option key={optionYear} value={optionYear}>
              {optionYear}년
            </option>
          ))}
        </select>

        <select
          value={month}
          onChange={(event) => {
            const nextMonth = Number(event.target.value);
            const nextDay = getDayOptions(year, nextMonth, minDate, maxDate)[0];
            onChange(buildDate(year, nextMonth, nextDay));
          }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none"
        >
          {monthOptions.map((optionMonth) => (
            <option key={optionMonth} value={optionMonth}>
              {optionMonth}월
            </option>
          ))}
        </select>

        <select
          value={day}
          onChange={(event) => onChange(buildDate(year, month, Number(event.target.value)))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none"
        >
          {dayOptions.map((optionDay) => (
            <option key={optionDay} value={optionDay}>
              {optionDay}일
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

function formatPassRate(completedPurchaseCount: number, applicationCount: number) {
  if (applicationCount === 0) return "0.0%";
  return `${((completedPurchaseCount / applicationCount) * 100).toFixed(1)}%`;
}

function summarizeRows(rows: DailyPurchaseMetrics[]) {
  return rows.reduce(
    (acc, row) => ({
      signupCount: acc.signupCount + row.signupCount,
      purchaseRequestCount: acc.purchaseRequestCount + row.purchaseRequestCount,
      applicationCount: acc.applicationCount + row.applicationCount,
      completedPurchaseCount: acc.completedPurchaseCount + row.completedPurchaseCount,
      storeRequestCount: acc.storeRequestCount + row.storeRequestCount,
      onlineRequestCount: acc.onlineRequestCount + row.onlineRequestCount,
      purchaseAmount: acc.purchaseAmount + row.purchaseAmount,
    }),
    {
      signupCount: 0,
      purchaseRequestCount: 0,
      applicationCount: 0,
      completedPurchaseCount: 0,
      storeRequestCount: 0,
      onlineRequestCount: 0,
      purchaseAmount: 0,
    },
  );
}

function countUniqueApplicants(visits: ApplicantVisit[]) {
  return new Set(visits.map((visit) => visit.applicantId)).size;
}

function calculatePopupToNormalReuseRate(
  popupRows: PurchaseRow[],
  allRows: PurchaseRow[],
) {
  if (popupRows.length === 0) {
    return "0.0%";
  }

  const firstPopupByApplicant = popupRows.reduce<Map<string, string>>((acc, row) => {
    if (!row.applicantId) {
      return acc;
    }

    const current = acc.get(row.applicantId);
    if (!current || row.date < current) {
      acc.set(row.applicantId, row.date);
    }
    return acc;
  }, new Map<string, string>());

  if (firstPopupByApplicant.size === 0) {
    return "0.0%";
  }

  const reusedApplicants = [...firstPopupByApplicant.entries()].filter(
    ([applicantId, firstPopupDate]) =>
      allRows.some(
        (row) =>
          row.applicantId === applicantId &&
          row.date > firstPopupDate &&
          NON_POPUP_CODES.has(row.routeCode) &&
          NON_POPUP_CODES.has(row.storeCode),
      ),
  ).length;

  return `${((reusedApplicants / firstPopupByApplicant.size) * 100).toFixed(1)}%`;
}

function isCompletedStatus(value: string) {
  const normalized = value.trim().toLowerCase();
  return COMPLETED_STATUS_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function getStoreLabel(storeCode: string) {
  return STORE_LABELS[storeCode] ?? storeCode;
}

function resolvePopupStoreCode(row: Pick<PurchaseRow, "routeCode" | "storeCode">) {
  if (POPUP_STORE_CODES.has(row.routeCode)) {
    return row.routeCode;
  }

  if (POPUP_STORE_CODES.has(row.storeCode)) {
    return row.storeCode;
  }

  return "";
}

function isPopupRow(row: Pick<PurchaseRow, "routeCode" | "storeCode">) {
  if (!POPUP_ROUTE_CODES.has(row.routeCode)) {
    return false;
  }

  return Boolean(resolvePopupStoreCode(row));
}

function isPopupOnlineRequest(row: Pick<PurchaseRow, "routeCode" | "storeCode">) {
  return row.routeCode === "OF" || POPUP_STORE_CODES.has(row.routeCode);
}

function isPopupStoreRequest(row: Pick<PurchaseRow, "routeCode">) {
  return row.routeCode === "FF";
}

function formatPopupSelectionLabel(year: number, storeCodes: string[]) {
  if (storeCodes.length === 0) {
    return `${year}년`;
  }

  return `${year} ${storeCodes.map((storeCode) => getStoreLabel(storeCode)).join(" + ")}`;
}

function getCurrentYear() {
  return new Date().getFullYear();
}

function getDefaultPopupStores(
  selectedYear: number,
  purchaseRows: PurchaseRow[],
  signupRows: SignupRow[],
  fallbackStores: string[],
) {
  const purchaseStoreCodes = purchaseRows
    .filter((row) => Number(row.date.slice(0, 4)) === selectedYear && isPopupRow(row))
    .map((row) => resolvePopupStoreCode(row))
    .filter(Boolean);

  if (purchaseStoreCodes.length > 0) {
    return [purchaseStoreCodes.at(-1) ?? purchaseStoreCodes[0]];
  }

  const signupStoreCodes = signupRows
    .filter(
      (row) =>
        Number(row.date.slice(0, 4)) === selectedYear && POPUP_STORE_CODES.has(row.branchState),
    )
    .map((row) => row.branchState);

  if (signupStoreCodes.length > 0) {
    return [signupStoreCodes.at(-1) ?? signupStoreCodes[0]];
  }

  if (fallbackStores.length > 0) {
    return [fallbackStores.at(-1) ?? fallbackStores[0]];
  }

  return [];
}

function getOverallVisibleMetrics(showInternalMetrics: boolean) {
  return [
    "signupCount",
    "applicantCount",
    "purchaseRequestCount",
    "applicationCount",
    "completedPurchaseCount",
    ...(showInternalMetrics ? (["purchaseAmount"] as const) : []),
  ] as const;
}

function getPopupVisibleMetrics(showInternalMetrics: boolean) {
  return [
    "signupCount",
    "applicantCount",
    "purchaseRequestCount",
    "applicationCount",
    ...(showInternalMetrics ? (["completedPurchaseCount", "purchaseAmount"] as const) : []),
  ] as const;
}

function buildSignupCountByDate(signupRows: SignupRow[]) {
  return signupRows.reduce<Record<string, number>>((acc, row) => {
    acc[row.date] = (acc[row.date] ?? 0) + 1;
    return acc;
  }, {});
}

function buildDailyMetrics(
  rows: PurchaseRow[],
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

  rows.forEach((row) => {
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
      if (isPopupOnlineRequest(row)) current.onlinePackageIds.add(row.itemPackageId);
      if (isPopupStoreRequest(row)) current.storePackageIds.add(row.itemPackageId);
    }

    if (row.itemId) current.itemIds.add(row.itemId);
    if (isCompletedStatus(row.purchaseStatus)) {
      if (row.itemId) current.completedItemIds.add(row.itemId);
    }
    if (row.applicantId) current.applicantIds.add(row.applicantId);

    byDate.set(row.date, current);
  });

  const dates = new Set<string>([...byDate.keys(), ...Object.keys(signupCountByDate)]);

  return [...dates]
    .map((date) => {
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
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .reverse();
}

function SectionBlock({
  sectionTitle,
  sectionDescription,
  rows,
  applicantCount,
  signupCount,
  showAmount,
  showPassRate,
  showCompletedCount,
  showChannelBreakdown,
  popupReuseRate,
  label,
  showPopupCards = false,
  children,
}: {
  sectionTitle: string;
  sectionDescription: string;
  rows: DailyPurchaseMetrics[];
  applicantCount: number;
  signupCount: number;
  showAmount: boolean;
  showPassRate: boolean;
  showCompletedCount: boolean;
  showChannelBreakdown: boolean;
  popupReuseRate?: string;
  label: string;
  showPopupCards?: boolean;
  children?: React.ReactNode;
}) {
  const totals = useMemo(() => summarizeRows(rows), [rows]);

  return (
    <section className="space-y-4">
      <div className="rounded-[32px] border border-white/70 bg-[var(--surface)] p-6 shadow-[var(--shadow)] backdrop-blur">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{sectionTitle}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{sectionDescription}</p>
        {children ? <div className="mt-5">{children}</div> : null}
      </div>

      <div className={`grid gap-4 ${showPopupCards ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2 xl:grid-cols-6"}`}>
        <KpiCard title="가입자수" value={signupCount} tone="slate" />
        <KpiCard title="신청자수" value={applicantCount} tone="teal" />
        <KpiCard
          title="매입신청건수"
          value={totals.purchaseRequestCount}
          tone="amber"
          caption={
            showChannelBreakdown ? (
              <>
                <span className="block">점포접수건 {totals.storeRequestCount.toLocaleString("ko-KR")}</span>
                <span className="block">온라인신청건 {totals.onlineRequestCount.toLocaleString("ko-KR")}</span>
              </>
            ) : undefined
          }
        />
        <KpiCard title="매입신청벌수" value={totals.applicationCount} tone="slate" />
        {showCompletedCount ? (
          <KpiCard title="검수통과갯수" value={totals.completedPurchaseCount} tone="slate" />
        ) : null}
        {showPassRate ? (
          <KpiCard
            title="통과율"
            value={formatPassRate(totals.completedPurchaseCount, totals.applicationCount)}
            tone="teal"
          />
        ) : null}
        {showAmount ? <KpiCard title="매입액" value={totals.purchaseAmount} tone="amber" /> : null}
        {showPopupCards ? (
          <>
            {showPassRate ? (
              <KpiCard title="팝업 이후 일반경로 재이용률" value={popupReuseRate ?? "0.0%"} tone="teal" />
            ) : null}
          </>
        ) : null}
      </div>

      <TrendChart
        rows={rows}
        label={label}
        title={`${sectionTitle} 추이`}
        showPassRate={showPassRate}
        visibleMetrics={
          showPopupCards
            ? [...getPopupVisibleMetrics(showAmount)]
            : [...getOverallVisibleMetrics(showAmount)]
        }
      />
      <SummaryTable
        rows={rows}
        title={`${sectionTitle} 일별 집계`}
        applicantCountTotal={applicantCount}
        showAmount={showAmount}
        showPassRate={showPassRate}
        showCompletedCount={showCompletedCount}
        showChannelBreakdown={showChannelBreakdown}
      />
    </section>
  );
}

export function DashboardClient({
  userRole,
  sections,
  latestDate,
  minDate,
  purchaseRows,
  signupRows,
  packageCreditByPackageId,
  applicantVisits,
}: DashboardClientProps) {
  const showInternalMetrics = userRole === "admin";
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") === "popup" ? "popup" : "overall";
  const fallbackLatestDate = latestDate ?? sections.overall.dailyRows[0]?.date ?? "2026-01-01";
  const fallbackMinDate = minDate ?? sections.overall.dailyRows.at(-1)?.date ?? fallbackLatestDate;
  const maxDate = sections.overall.dailyRows[0]?.date ?? fallbackLatestDate;

  const [preset, setPreset] = useState<Preset>("30d");
  const [startDate, setStartDate] = useState(clampDate(subtractDays(maxDate, 29), fallbackMinDate, maxDate));
  const [endDate, setEndDate] = useState(maxDate);

  const popupCandidates = useMemo(() => {
    const codes = new Set<string>();
    purchaseRows.forEach((row) => {
      if (isPopupRow(row)) {
        codes.add(resolvePopupStoreCode(row));
      }
    });
    signupRows.forEach((row) => {
      if (POPUP_STORE_CODES.has(row.branchState)) {
        codes.add(row.branchState);
      }
    });
    return [...codes].sort();
  }, [purchaseRows, signupRows]);

  const popupYears = useMemo(() => {
    const years = new Set<number>();
    purchaseRows.forEach((row) => {
      if (isPopupRow(row)) {
        years.add(Number(row.date.slice(0, 4)));
      }
    });
    signupRows.forEach((row) => {
      if (POPUP_STORE_CODES.has(row.branchState)) {
        years.add(Number(row.date.slice(0, 4)));
      }
    });
    years.add(getCurrentYear());
    return [...years].sort((a, b) => a - b);
  }, [purchaseRows, signupRows]);

  const [selectedPopupYear, setSelectedPopupYear] = useState<number>(
    popupYears.includes(Number(maxDate.slice(0, 4)))
      ? Number(maxDate.slice(0, 4))
      : (popupYears.at(-1) ?? Number(maxDate.slice(0, 4))),
  );
  const [selectedPopupStores, setSelectedPopupStores] = useState<string[]>(() =>
    getDefaultPopupStores(
      popupYears.includes(Number(maxDate.slice(0, 4)))
        ? Number(maxDate.slice(0, 4))
        : (popupYears.at(-1) ?? Number(maxDate.slice(0, 4))),
      purchaseRows,
      signupRows,
      popupCandidates,
    ),
  );

  const effectiveRange = useMemo(() => {
    if (preset === "7d") {
      return { start: clampDate(subtractDays(maxDate, 6), fallbackMinDate, maxDate), end: maxDate, label: "최근 7일" };
    }
    if (preset === "30d") {
      return { start: clampDate(subtractDays(maxDate, 29), fallbackMinDate, maxDate), end: maxDate, label: "최근 30일" };
    }
    if (preset === "all") {
      return { start: fallbackMinDate, end: maxDate, label: "전체 기간" };
    }

    const normalizedStart = clampDate(startDate, fallbackMinDate, maxDate);
    const normalizedEnd = clampDate(endDate, fallbackMinDate, maxDate);
    return {
      start: normalizedStart <= normalizedEnd ? normalizedStart : normalizedEnd,
      end: normalizedEnd >= normalizedStart ? normalizedEnd : normalizedStart,
      label: `${normalizedStart} ~ ${normalizedEnd}`,
    };
  }, [endDate, fallbackMinDate, maxDate, preset, startDate]);

  const filteredOverallRows = useMemo(
    () =>
      sections.overall.dailyRows.filter(
        (row) => row.date >= effectiveRange.start && row.date <= effectiveRange.end,
      ),
    [effectiveRange.end, effectiveRange.start, sections.overall.dailyRows],
  );

  const filteredApplicantVisits = useMemo(
    () =>
      applicantVisits.filter(
        (visit) => visit.date >= effectiveRange.start && visit.date <= effectiveRange.end,
      ),
    [applicantVisits, effectiveRange.end, effectiveRange.start],
  );

  const overallApplicantCount = useMemo(
    () => countUniqueApplicants(filteredApplicantVisits),
    [filteredApplicantVisits],
  );
  const overallSignupCount = useMemo(
    () =>
      signupRows.filter(
        (row) => row.date >= effectiveRange.start && row.date <= effectiveRange.end,
      ).length,
    [effectiveRange.end, effectiveRange.start, signupRows],
  );

  const popupLabel = formatPopupSelectionLabel(selectedPopupYear, selectedPopupStores);

  const popupRows = useMemo(
    () =>
      purchaseRows.filter((row) => {
        if (Number(row.date.slice(0, 4)) !== selectedPopupYear) return false;
        if (!isPopupRow(row)) return false;
        if (selectedPopupStores.length === 0) return false;
        return selectedPopupStores.includes(resolvePopupStoreCode(row));
      }),
    [purchaseRows, selectedPopupStores, selectedPopupYear],
  );

  const popupSignupRows = useMemo(
    () =>
      signupRows.filter(
        (row) =>
          Number(row.date.slice(0, 4)) === selectedPopupYear &&
          selectedPopupStores.includes(row.branchState) &&
          (row.pathState === "OF" || row.pathState === "OO"),
      ),
    [selectedPopupStores, selectedPopupYear, signupRows],
  );
  const popupDailyRows = useMemo(
    () =>
      buildDailyMetrics(
        popupRows,
        packageCreditByPackageId,
        buildSignupCountByDate(popupSignupRows),
      ),
    [packageCreditByPackageId, popupRows, popupSignupRows],
  );
  const popupApplicantVisits = useMemo(
    () =>
      popupRows
        .filter((row) => row.applicantId)
        .map((row) => ({ date: row.date, applicantId: row.applicantId })),
    [popupRows],
  );
  const popupApplicantCount = useMemo(
    () => countUniqueApplicants(popupApplicantVisits),
    [popupApplicantVisits],
  );
  const popupSignupCount = useMemo(() => popupSignupRows.length, [popupSignupRows]);
  const popupReuseRate = useMemo(
    () => calculatePopupToNormalReuseRate(popupRows, purchaseRows),
    [popupRows, purchaseRows],
  );

  return (
    <>
      <section className="rounded-[32px] border border-white/70 bg-[var(--surface)] p-6 shadow-[var(--shadow)] backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              {activeTab === "overall" ? "전체 기간 필터" : "연도 및 지점 선택"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              {activeTab === "overall" ? effectiveRange.label : popupLabel}
            </h2>
          </div>
        </div>

        {activeTab === "overall" ? (
          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {[
                { key: "7d", label: "최근 7일" },
                { key: "30d", label: "최근 30일" },
                { key: "all", label: "전체 기간" },
              ].map((option) => {
                const active = preset === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setPreset(option.key as Preset)}
                    className={`rounded-full px-4 py-2 text-sm transition ${
                      active
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
              <DateSelect
                label="시작일"
                value={startDate}
                minDate={fallbackMinDate}
                maxDate={maxDate}
                onChange={(nextValue) => {
                  setPreset("custom");
                  setStartDate(nextValue);
                }}
              />
              <DateSelect
                label="종료일"
                value={endDate}
                minDate={fallbackMinDate}
                maxDate={maxDate}
                onChange={(nextValue) => {
                  setPreset("custom");
                  setEndDate(nextValue);
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setPreset("custom");
                  setStartDate(fallbackMinDate);
                  setEndDate(maxDate);
                }}
                className="rounded-[24px] border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                전체 기간 보기
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-[0.8fr_1.4fr]">
            <label className="rounded-[24px] border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600">
              연도
              <select
                value={selectedPopupYear}
                onChange={(event) => setSelectedPopupYear(Number(event.target.value))}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none"
              >
                {popupYears.map((year) => (
                  <option key={year} value={year}>
                    {year}년
                  </option>
                ))}
              </select>
            </label>
            <div className="rounded-[24px] border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600">
              팝업 지점
              <div className="mt-3 flex flex-wrap gap-2">
                {popupCandidates.map((storeCode) => {
                  const active = selectedPopupStores.includes(storeCode);
                  return (
                    <button
                      key={storeCode}
                      type="button"
                      onClick={() =>
                        setSelectedPopupStores((current) =>
                          current.includes(storeCode)
                            ? current.filter((code) => code !== storeCode)
                            : [...current, storeCode].sort(),
                        )
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {getStoreLabel(storeCode)}
                    </button>
                  );
                })}
                {popupCandidates.length === 0 ? (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
                    팝업 지점 코드 없음
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </section>

      {activeTab === "overall" ? (
        <SectionBlock
          sectionTitle={sections.overall.title}
          sectionDescription={sections.overall.description}
          rows={filteredOverallRows}
          applicantCount={overallApplicantCount}
          signupCount={overallSignupCount}
          showAmount={showInternalMetrics}
          showPassRate={showInternalMetrics}
          showCompletedCount
          showChannelBreakdown={false}
          label={effectiveRange.label}
        />
      ) : (
        <SectionBlock
          sectionTitle="팝업 집계용"
          sectionDescription="선택한 지점과 연도에 해당하는 팝업 행사 중, 사전신청 및 현장신청을 통해 접수된 건을 집계합니다"
          rows={popupDailyRows}
          applicantCount={popupApplicantCount}
          signupCount={popupSignupCount}
          showAmount={showInternalMetrics}
          showPassRate={showInternalMetrics}
          showCompletedCount={showInternalMetrics}
          showChannelBreakdown
          popupReuseRate={popupReuseRate}
          label={popupLabel}
          showPopupCards
        />
      )}
    </>
  );
}

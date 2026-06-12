"use client";

import { useMemo, useState } from "react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import {
  getSeedPayoutMap,
  MONTHLY_SETTLEMENT_SEEDS,
} from "@/lib/settlements/manual-data";
import type { ManualSettlementStore } from "@/lib/settlements/manual-store";

interface SettlementClientProps {
  monthOptions: string[];
  initialStore: ManualSettlementStore;
  canManage: boolean;
}

interface GeneratedNoticeLinks {
  docNo: string;
  documentUrl: string;
  pdfUrl: string;
}

function formatCurrency(value: number) {
  return `${value.toLocaleString("ko-KR")}원`;
}

function formatMonthLabel(month: string) {
  const [year, rawMonth] = month.split("-");
  return `${year}년 ${Number(rawMonth)}월`;
}

function monthNumberLabel(month: string) {
  return `${Number(month.split("-")[1])}월`;
}

function nextMonthUpdateLabel(month: string) {
  const [year, rawMonth] = month.split("-");
  const date = new Date(Number(year), Number(rawMonth) - 1, 1);
  date.setMonth(date.getMonth() + 1);
  return `${date.getMonth() + 1}월 1일 업데이트됩니다`;
}

export function SettlementClient({
  monthOptions,
  initialStore,
  canManage,
}: SettlementClientProps) {
  const seedMap = useMemo(() => getSeedPayoutMap(), []);
  const latestSeedMonth = MONTHLY_SETTLEMENT_SEEDS.at(-1)?.month ?? monthOptions.at(-1) ?? "";
  const [startMonth, setStartMonth] = useState(monthOptions[0] ?? "");
  const [endMonth, setEndMonth] = useState(latestSeedMonth);
  const [monthlyPayouts, setMonthlyPayouts] = useState<Record<string, number>>(() => ({
    ...seedMap,
    ...Object.fromEntries(
      Object.entries(initialStore.months).map(([month, entry]) => [month, entry.payoutAmount]),
    ),
  }));
  const [confirmedMonths, setConfirmedMonths] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      Object.entries(initialStore.months).map(([month, entry]) => [month, entry.confirmed]),
    ),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isGeneratingNotice, setIsGeneratingNotice] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [generatedNoticeLinks, setGeneratedNoticeLinks] = useState<GeneratedNoticeLinks | null>(
    null,
  );

  const normalizedRange = useMemo(() => {
    const sorted = [startMonth, endMonth].sort();
    return { start: sorted[0], end: sorted[1] };
  }, [endMonth, startMonth]);

  const latestMonthOption = monthOptions.at(-1) ?? "";
  const selectedMonth = endMonth;
  const selectedPayoutAmount = monthlyPayouts[selectedMonth] ?? 0;
  const isSelectedMonthConfirmed = confirmedMonths[selectedMonth] ?? false;
  const canEditSelectedMonth =
    canManage && selectedMonth === latestMonthOption && !isSelectedMonthConfirmed;
  const canUnlockSelectedMonth =
    canManage && selectedMonth === latestMonthOption && isSelectedMonthConfirmed;
  const feeAmount = Math.round(selectedPayoutAmount * 0.02);
  const vatAmount = Math.round(feeAmount * 0.1);
  const totalWithVat = feeAmount + vatAmount;

  const monthlyRows = useMemo(
    () =>
      monthOptions
        .filter((month) => month >= normalizedRange.start && month <= normalizedRange.end)
        .map((month) => {
          const payoutAmount = monthlyPayouts[month] ?? 0;
          const monthlyFeeAmount = Math.round(payoutAmount * 0.02);
          const monthlyVatAmount = Math.round(monthlyFeeAmount * 0.1);
          const monthlyTotalWithVat = monthlyFeeAmount + monthlyVatAmount;

          return {
            month,
            label: formatMonthLabel(month),
            payoutAmount,
            feeAmount: monthlyFeeAmount,
            vatAmount: monthlyVatAmount,
            totalWithVat: monthlyTotalWithVat,
          };
        }),
    [monthOptions, monthlyPayouts, normalizedRange.end, normalizedRange.start],
  );

  const periodTotals = useMemo(
    () =>
      monthlyRows.reduce(
        (acc, row) => ({
          payoutAmount: acc.payoutAmount + row.payoutAmount,
          feeAmount: acc.feeAmount + row.feeAmount,
        }),
        {
          payoutAmount: 0,
          feeAmount: 0,
        },
      ),
    [monthlyRows],
  );

  async function persistMonth(action: "confirm" | "unlock") {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch("/api/settlements/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          month: selectedMonth,
          payoutAmount: selectedPayoutAmount,
        }),
      });
      const result = (await response.json()) as
        | { ok: true; data: ManualSettlementStore }
        | { ok: false; error: string };

      if (!response.ok || !result.ok) {
        throw new Error(result.ok ? "정산 저장에 실패했습니다." : result.error);
      }

      setMonthlyPayouts((current) => ({
        ...current,
        ...Object.fromEntries(
          Object.entries(result.data.months).map(([month, entry]) => [month, entry.payoutAmount]),
        ),
      }));
      setConfirmedMonths(
        Object.fromEntries(
          Object.entries(result.data.months).map(([month, entry]) => [month, entry.confirmed]),
        ),
      );
      setSaveMessage(
        action === "confirm"
          ? `${formatMonthLabel(selectedMonth)} 정산 입력을 확정했습니다.`
          : `${formatMonthLabel(selectedMonth)} 정산 입력을 수정 가능 상태로 변경했습니다.`,
      );
    } catch (error) {
      setSaveMessage(
        error instanceof Error ? error.message : "정산 저장 중 오류가 발생했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function generateNoticePdf() {
    setIsGeneratingNotice(true);
    setNoticeMessage(null);
    setGeneratedNoticeLinks(null);

    try {
      const response = await fetch("/api/settlements/notice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month: selectedMonth,
          payoutAmount: selectedPayoutAmount,
        }),
      });

      if (!response.ok) {
        const result = (await response.json()) as { ok: false; error: string };
        throw new Error(result.error);
      }

      const result = (await response.json()) as {
        ok: true;
        data: {
          pdfUrl: string;
          documentUrl: string;
          docNo: string;
        };
      };

      setGeneratedNoticeLinks({
        docNo: result.data.docNo,
        documentUrl: result.data.documentUrl,
        pdfUrl: result.data.pdfUrl,
      });

      setNoticeMessage(
        `${formatMonthLabel(selectedMonth)} 공문 PDF를 생성했습니다. 문서번호 ${result.data.docNo}`,
      );
    } catch (error) {
      setNoticeMessage(
        error instanceof Error ? error.message : "공문 PDF 생성 중 오류가 발생했습니다.",
      );
    } finally {
      setIsGeneratingNotice(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
      <section className="rounded-[36px] border border-white/70 bg-[var(--surface)] p-8 shadow-[var(--shadow)] backdrop-blur">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-700">
          Settlement
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          월별 L.Point 정산 내역
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          월별 지급 엘포인트, 롯데백화점 수수료를 확인하실 수 있습니다
        </p>
      </section>

      <section className="rounded-[32px] border border-white/70 bg-[var(--surface)] p-6 shadow-[var(--shadow)] backdrop-blur">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <label className="rounded-[24px] border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600">
            시작월
            <select
              value={startMonth}
              onChange={(event) => setStartMonth(event.target.value)}
              className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none"
            >
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {formatMonthLabel(month)}
                </option>
              ))}
            </select>
          </label>

          <label className="rounded-[24px] border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600">
            종료월
            <select
              value={endMonth}
              onChange={(event) => setEndMonth(event.target.value)}
              className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none"
            >
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {formatMonthLabel(month)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <KpiCard
          title={`${monthNumberLabel(selectedMonth)} 지급 엘포인트 총액`}
          value={selectedPayoutAmount}
          tone="teal"
        />
        <KpiCard
          title="롯데백화점 수수료액"
          value={feeAmount}
          tone="amber"
        />
        <KpiCard
          title="부가세 포함 총액"
          value={totalWithVat}
          tone="slate"
          caption={`부가세액 ${vatAmount.toLocaleString("ko-KR")}원`}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[32px] border border-white/70 bg-[var(--surface)] p-6 shadow-[var(--shadow)] backdrop-blur">
          <div>
            <p className="text-sm font-medium text-slate-500">정산 입력</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              {monthNumberLabel(selectedMonth)} 엘포인트 지급액 및 수수료
            </h2>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
            <label className="rounded-[24px] border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600">
              엘포인트 지급액
              <input
                inputMode="numeric"
                value={selectedPayoutAmount === 0 ? "" : String(selectedPayoutAmount)}
                onChange={(event) =>
                  setMonthlyPayouts((current) => ({
                    ...current,
                    [selectedMonth]: Number(event.target.value.replace(/[^\d]/g, "")) || 0,
                  }))
                }
                placeholder="엘포인트 지급액을 입력하세요"
                disabled={!canEditSelectedMonth || isSaving}
                className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none"
              />
            </label>

            <div className="rounded-[24px] border border-slate-200 bg-slate-900 px-5 py-4 text-white">
              <p className="text-sm text-slate-300">롯데백화점 수수료</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight">
                {feeAmount.toLocaleString("ko-KR")}원
              </p>
              <p className="mt-2 text-sm text-slate-300">엘포인트 지급액의 2%</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[24px] border border-slate-200 bg-white/80 px-4 py-4">
              <p className="text-sm text-slate-500">{monthNumberLabel(selectedMonth)} 지급 엘포인트 총액</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {formatCurrency(selectedPayoutAmount)}
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white/80 px-4 py-4">
              <p className="text-sm text-slate-500">롯데백화점 수수료액</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {feeAmount.toLocaleString("ko-KR")}원
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white/80 px-4 py-4">
              <p className="text-sm text-slate-500">부가세 포함 총액</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {totalWithVat.toLocaleString("ko-KR")}원
              </p>
              <p className="mt-2 text-sm text-slate-500">
                부가세액 {vatAmount.toLocaleString("ko-KR")}원
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-600">
                {selectedMonth !== latestMonthOption
                  ? "이전 월은 확정 완료로 간주되어 파트너사에서 수정할 수 없습니다."
                  : !canManage
                    ? "파트너사 계정은 정산 내역 조회만 가능하며 지급액 입력, 확정, 수정은 할 수 없습니다."
                  : isSelectedMonthConfirmed
                    ? "이 월은 확정되었습니다. 필요 시 수정 버튼으로 최신 월만 다시 열 수 있습니다."
                    : `${nextMonthUpdateLabel(selectedMonth)}`}
              </div>
              <div className="flex gap-2">
                {canManage ? (
                  <button
                    type="button"
                    onClick={() => void generateNoticePdf()}
                    disabled={isGeneratingNotice || isSaving || selectedPayoutAmount <= 0}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isGeneratingNotice ? "PDF 생성 중..." : "공문 PDF 생성"}
                  </button>
                ) : null}
                {canUnlockSelectedMonth ? (
                  <button
                    type="button"
                    onClick={() => void persistMonth("unlock")}
                    disabled={isSaving}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Edit
                  </button>
                ) : null}
                {selectedMonth === latestMonthOption ? (
                  <button
                    type="button"
                    onClick={() => void persistMonth("confirm")}
                    disabled={!canEditSelectedMonth || isSaving}
                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    confirm
                  </button>
                ) : null}
              </div>
            </div>
            {saveMessage ? (
              <p className="mt-3 text-sm text-slate-600">{saveMessage}</p>
            ) : null}
            {noticeMessage ? (
              <p className="mt-3 text-sm text-slate-600">{noticeMessage}</p>
            ) : null}
            {generatedNoticeLinks ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={generatedNoticeLinks.documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  문서 열기
                </a>
                <a
                  href={generatedNoticeLinks.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  PDF 열기
                </a>
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-[32px] border border-white/70 bg-[var(--surface)] p-6 shadow-[var(--shadow)] backdrop-blur">
          <p className="text-sm font-medium text-slate-500">월별 내역</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            선택 구간 월별 요약
          </h2>

          <div className="mt-6 space-y-3">
            {monthlyRows.map((row) => (
              <div
                key={row.month}
                className="flex items-center justify-between rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4"
              >
                <div>
                  <p className="font-medium text-slate-700">{row.label}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    수수료 {row.feeAmount.toLocaleString("ko-KR")}원
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-slate-900">
                    {row.payoutAmount.toLocaleString("ko-KR")}원
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    총액 {row.totalWithVat.toLocaleString("ko-KR")}원
                  </p>
                </div>
              </div>
            ))}
            {monthlyRows.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-slate-300 bg-white/70 px-4 py-8 text-center text-sm text-slate-500">
                선택한 조건에 해당하는 월별 데이터가 없습니다.
              </div>
            ) : null}
            {monthlyRows.length > 0 ? (
              <div className="rounded-[22px] border border-slate-200 bg-white/80 px-4 py-4">
                <p className="font-medium text-slate-700">기간 총 합계</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm text-slate-500">엘포인트 총액</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      {periodTotals.payoutAmount.toLocaleString("ko-KR")}원
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm text-slate-500">수수료 총액</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      {periodTotals.feeAmount.toLocaleString("ko-KR")}원
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}

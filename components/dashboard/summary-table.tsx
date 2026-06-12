import type { DailyPurchaseMetrics } from "@/lib/sheets";

interface SummaryTableProps {
  rows: DailyPurchaseMetrics[];
  title: string;
  applicantCountTotal: number;
  showAmount: boolean;
  showPassRate: boolean;
  showCompletedCount: boolean;
  showChannelBreakdown: boolean;
}

function formatPassRate(completedPurchaseCount: number, applicationCount: number) {
  if (applicationCount === 0) {
    return "0.0%";
  }

  return `${((completedPurchaseCount / applicationCount) * 100).toFixed(1)}%`;
}

export function SummaryTable({
  rows,
  title,
  applicantCountTotal,
  showAmount,
  showPassRate,
  showCompletedCount,
  showChannelBreakdown,
}: SummaryTableProps) {
  const totals = rows.reduce(
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

  return (
    <section className="rounded-[32px] border border-white/70 bg-[var(--surface)] p-6 shadow-[var(--shadow)] backdrop-blur">
      <div>
        <p className="text-sm font-medium text-slate-500">Daily Summary</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
      </div>

      <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse bg-[var(--surface-strong)] text-sm">
            <thead className="bg-slate-900 text-left text-white">
              <tr>
                <th className="px-4 py-3 font-medium">날짜</th>
                <th className="px-4 py-3 font-medium">신청자수</th>
                <th className="px-4 py-3 font-medium">가입자수</th>
                <th className="px-4 py-3 font-medium">매입신청건수</th>
                <th className="px-4 py-3 font-medium">매입신청벌수</th>
                {showCompletedCount ? (
                  <th className="px-4 py-3 font-medium">검수통과갯수</th>
                ) : null}
                {showAmount ? <th className="px-4 py-3 font-medium">매입액</th> : null}
                {showPassRate ? <th className="px-4 py-3 font-medium">통과율</th> : null}
                {showChannelBreakdown ? (
                  <>
                    <th className="px-4 py-3 font-medium">점포접수건</th>
                    <th className="px-4 py-3 font-medium">온라인신청건</th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.date} className="border-t border-slate-200 text-slate-700">
                  <td className="px-4 py-3 font-medium">{row.date}</td>
                  <td className="px-4 py-3">{row.applicantCount.toLocaleString("ko-KR")}</td>
                  <td className="px-4 py-3">{row.signupCount.toLocaleString("ko-KR")}</td>
                  <td className="px-4 py-3">{row.purchaseRequestCount.toLocaleString("ko-KR")}</td>
                  <td className="px-4 py-3">{row.applicationCount.toLocaleString("ko-KR")}</td>
                  {showCompletedCount ? (
                    <td className="px-4 py-3">
                      {row.completedPurchaseCount.toLocaleString("ko-KR")}
                    </td>
                  ) : null}
                  {showAmount ? (
                    <td className="px-4 py-3">{row.purchaseAmount.toLocaleString("ko-KR")}</td>
                  ) : null}
                  {showPassRate ? (
                    <td className="px-4 py-3">
                      {formatPassRate(row.completedPurchaseCount, row.applicationCount)}
                    </td>
                  ) : null}
                  {showChannelBreakdown ? (
                    <>
                      <td className="px-4 py-3">{row.storeRequestCount.toLocaleString("ko-KR")}</td>
                      <td className="px-4 py-3">{row.onlineRequestCount.toLocaleString("ko-KR")}</td>
                    </>
                  ) : null}
                </tr>
              ))}
              <tr className="border-t-2 border-slate-300 bg-slate-100 font-semibold text-slate-900">
                <td className="px-4 py-3">합계</td>
                <td className="px-4 py-3">{applicantCountTotal.toLocaleString("ko-KR")}</td>
                <td className="px-4 py-3">{totals.signupCount.toLocaleString("ko-KR")}</td>
                <td className="px-4 py-3">
                  {totals.purchaseRequestCount.toLocaleString("ko-KR")}
                </td>
                <td className="px-4 py-3">{totals.applicationCount.toLocaleString("ko-KR")}</td>
                {showCompletedCount ? (
                  <td className="px-4 py-3">
                    {totals.completedPurchaseCount.toLocaleString("ko-KR")}
                  </td>
                ) : null}
                {showAmount ? (
                  <td className="px-4 py-3">{totals.purchaseAmount.toLocaleString("ko-KR")}</td>
                ) : null}
                {showPassRate ? (
                  <td className="px-4 py-3">
                    {formatPassRate(totals.completedPurchaseCount, totals.applicationCount)}
                  </td>
                ) : null}
                {showChannelBreakdown ? (
                  <>
                    <td className="px-4 py-3">{totals.storeRequestCount.toLocaleString("ko-KR")}</td>
                    <td className="px-4 py-3">
                      {totals.onlineRequestCount.toLocaleString("ko-KR")}
                    </td>
                  </>
                ) : null}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

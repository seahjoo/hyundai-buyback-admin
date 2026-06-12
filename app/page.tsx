import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { ErrorPanel } from "@/components/dashboard/error-panel";
import { getCurrentSession } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/sheets";

export default async function DashboardPage() {
  const session = await getCurrentSession();
  const result = await getDashboardData();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
      <section className="overflow-hidden rounded-[36px] border border-white/70 bg-[var(--surface)] p-8 shadow-[var(--shadow)] backdrop-blur">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-700">
          Hyundai Admin
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          더현대바이백 운영 대시보드
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          전체 운영 지표와 팝업 집계 지표를 한 화면에서 확인하실 수 있습니다
        </p>
      </section>

      {result.ok ? (
        <DashboardClient
          userRole={session?.role ?? "partner"}
          sections={result.data.sections}
          latestDate={result.data.latestDate}
          minDate={result.data.minDate}
          purchaseRows={result.data.purchaseRows}
          signupRows={result.data.signupRows}
          packageCreditByPackageId={result.data.packageCreditByPackageId}
          applicantVisits={result.data.applicantVisits}
        />
      ) : (
        <ErrorPanel
          message={result.error}
          headers={result.meta.headers}
          sourceUrl={result.meta.sourceUrl}
        />
      )}
    </main>
  );
}

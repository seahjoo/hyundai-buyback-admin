interface ErrorPanelProps {
  message: string;
  headers?: string[];
  sourceUrl: string;
}

export function ErrorPanel({ message, headers, sourceUrl }: ErrorPanelProps) {
  return (
    <section className="rounded-[32px] border border-red-200 bg-white/85 p-8 shadow-[var(--shadow)]">
      <p className="text-sm font-medium text-red-600">Data Error</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
        대시보드 데이터를 불러오지 못했습니다
      </h2>
      <p className="mt-4 text-sm leading-6 text-slate-700">{message}</p>
      <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
        해결 방법: Google Sheets를 공개 CSV로 발행하거나 서비스 계정에 시트 보기 권한을 공유해 주세요.
      </div>
      <p className="mt-4 break-all rounded-2xl bg-slate-100 px-4 py-3 text-xs text-slate-600">
        Source: {sourceUrl}
      </p>
      {headers && headers.length > 0 ? (
        <div className="mt-5">
          <p className="text-sm font-medium text-slate-700">감지된 CSV 헤더</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {headers.map((header) => (
              <span
                key={header}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
              >
                {header}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

interface KpiCardProps {
  title: string;
  value: number | string;
  tone: "teal" | "amber" | "slate";
  caption?: React.ReactNode;
}

const toneClasses = {
  teal: "from-violet-100/58 via-purple-50/30 to-white/18 text-slate-900",
  amber: "from-violet-100/56 via-purple-50/28 to-white/18 text-slate-900",
  slate: "from-violet-100/52 via-indigo-50/24 to-white/18 text-slate-900",
};

export function KpiCard({ title, value, tone, caption }: KpiCardProps) {
  const formattedValue =
    typeof value === "number" ? value.toLocaleString("ko-KR") : value;

  return (
    <article
      className={`rounded-[28px] border border-white/70 bg-linear-to-br ${toneClasses[tone]} p-6 shadow-[var(--shadow)] backdrop-blur`}
    >
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-4 text-4xl font-semibold tracking-tight">{formattedValue}</p>
      {caption ? <p className="mt-3 text-sm text-slate-600">{caption}</p> : null}
    </article>
  );
}

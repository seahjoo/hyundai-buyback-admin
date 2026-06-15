"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { SessionPayload } from "@/lib/auth/session";

interface AppShellProps {
  children: React.ReactNode;
  session: SessionPayload | null;
}

export function AppShell({ children, session }: AppShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") === "popup" ? "popup" : "overall";
  const isDashboard = pathname === "/";

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-white/70 bg-white/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-teal-700 sm:text-base">
              THE HYUNDAI BUYBACK ADMIN
            </p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 sm:text-xs">
              THE HYUNDAI ADMIN
            </p>
          </div>
          {session ? (
            <div className="flex items-center gap-3">
              {isDashboard ? (
                <nav className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1">
                  {[
                    { key: "overall", label: "전체", href: "/?tab=overall" },
                    { key: "popup", label: "팝업", href: "/?tab=popup" },
                  ].map((item) => {
                    const active = activeTab === item.key;
                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`rounded-full px-4 py-2 text-sm transition ${
                          active
                            ? "bg-slate-900 font-medium !text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              ) : null}
              <div className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 sm:block">
                {session.displayName}
              </div>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                로그아웃
              </button>
            </div>
          ) : null}
        </div>
      </header>
      {children}
    </>
  );
}

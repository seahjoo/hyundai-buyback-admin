import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentSession } from "@/lib/auth/session";

export default async function LoginPage() {
  const session = await getCurrentSession();

  if (session) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-5 py-10 sm:px-8">
      <section className="w-full rounded-[36px] border border-white/70 bg-[var(--surface)] p-8 shadow-[var(--shadow)] backdrop-blur">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-700">
          Access
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
          더현대 바이백
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          권한이 있는 계정으로 로그인 후 운영 대시보드를 확인하세요
        </p>
        <LoginForm />
      </section>
    </main>
  );
}

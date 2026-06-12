"use client";

import { useState } from "react";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const result = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "로그인에 실패했습니다.");
      }

      window.location.href = "/";
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "로그인 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <label className="block rounded-[24px] border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600">
        아이디
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none"
          placeholder="아이디를 입력하세요"
          autoComplete="username"
        />
      </label>

      <label className="block rounded-[24px] border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600">
        비밀번호
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 outline-none"
          placeholder="비밀번호를 입력하세요"
          autoComplete="current-password"
        />
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "로그인 중..." : "로그인"}
      </button>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </form>
  );
}

import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { getCurrentSession } from "@/lib/auth/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hyundai Buyback Admin",
  description: "현대 바이백 운영 대시보드",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentSession();

  return (
    <html lang="ko">
      <body>
        <AppShell session={session}>{children}</AppShell>
      </body>
    </html>
  );
}

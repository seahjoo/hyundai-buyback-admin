import { NextResponse } from "next/server";
import { canManageSettlements, getCurrentSession } from "@/lib/auth/session";
import { generateSettlementNoticePdf } from "@/lib/settlements/notice";

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!canManageSettlements(session)) {
    return NextResponse.json(
      { ok: false, error: "공문 생성 권한이 없습니다." },
      { status: 403 },
    );
  }

  const body = (await request.json()) as {
    month?: string;
    payoutAmount?: number;
  };

  if (!body.month) {
    return NextResponse.json({ ok: false, error: "month is required." }, { status: 400 });
  }

  const payoutAmount = Number(body.payoutAmount ?? 0);

  try {
    const result = await generateSettlementNoticePdf(body.month, payoutAmount);

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "공문 PDF 생성 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}

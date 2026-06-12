import { NextResponse } from "next/server";
import { canManageSettlements, getCurrentSession } from "@/lib/auth/session";
import {
  confirmManualSettlementMonth,
  readManualSettlementStore,
  unlockManualSettlementMonth,
} from "@/lib/settlements/manual-store";

interface ManualSettlementRequestBody {
  action?: "confirm" | "unlock";
  month?: string;
  payoutAmount?: number;
}

export async function GET() {
  const store = await readManualSettlementStore();
  return NextResponse.json({ ok: true, data: store });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!canManageSettlements(session)) {
    return NextResponse.json(
      { ok: false, error: "정산 입력 권한이 없습니다." },
      { status: 403 },
    );
  }

  const body = (await request.json()) as ManualSettlementRequestBody;

  if (!body.month || !body.action) {
    return NextResponse.json(
      { ok: false, error: "month and action are required." },
      { status: 400 },
    );
  }

  if (body.action === "confirm") {
    const payoutAmount = Number(body.payoutAmount ?? 0);
    const store = await confirmManualSettlementMonth(body.month, payoutAmount);
    return NextResponse.json({ ok: true, data: store });
  }

  if (body.action === "unlock") {
    const store = await unlockManualSettlementMonth(body.month);
    return NextResponse.json({ ok: true, data: store });
  }

  return NextResponse.json({ ok: false, error: "Unsupported action." }, { status: 400 });
}

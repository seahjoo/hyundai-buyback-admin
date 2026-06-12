import { headers } from "next/headers";
import { NextResponse } from "next/server";
import {
  SETTLEMENTS_DEFAULT_DATE_TYPE,
  SETTLEMENTS_MIN_DATE,
} from "@/lib/settlements";
import { getSettlementDataServer } from "@/lib/settlements/provider";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("start_date") ?? SETTLEMENTS_MIN_DATE;
  const endDate = searchParams.get("end_date") ?? today();
  const dateType = searchParams.get("date_type") ?? SETTLEMENTS_DEFAULT_DATE_TYPE;
  const headerStore = await headers();
  const incomingCookieHeader = headerStore.get("cookie");

  const result = await getSettlementDataServer(
    {
      startDate,
      endDate,
      dateType,
    },
    incomingCookieHeader,
  );

  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json(result);
}

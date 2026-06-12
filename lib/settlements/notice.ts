const APPS_SCRIPT_NOTICE_WEBHOOK_URL =
  process.env.APPS_SCRIPT_NOTICE_WEBHOOK_URL ??
  "https://script.google.com/macros/s/AKfycbxTxbVEPRO691jrTUQZqKjo22W_MTXRZ7gRgxxZ3R6HbItyMh3Cc3P0X2PVmMGUw-DCYA/exec";
const DOC_SEQUENCE_BASE_MONTH =
  process.env.GOOGLE_DOCS_NOTICE_SEQUENCE_BASE_MONTH ?? "2026-04";
const DOC_SEQUENCE_START = Number(process.env.GOOGLE_DOCS_NOTICE_SEQUENCE_START ?? "10");
const DOC_SEQUENCE_STEP = Number(process.env.GOOGLE_DOCS_NOTICE_SEQUENCE_STEP ?? "2");

interface AppsScriptNoticeResponse {
  ok: boolean;
  error?: string;
  documentId?: string;
  documentUrl?: string;
  pdfFileId?: string;
  pdfUrl?: string;
  fileName?: string;
}

function getSettlementYear(month: string) {
  return Number(month.split("-")[0]);
}

function getDocumentNumber(month: string) {
  const [targetYear, targetMonth] = month.split("-").map(Number);
  const [baseYear, baseMonth] = DOC_SEQUENCE_BASE_MONTH.split("-").map(Number);
  const monthOffset = (targetYear - baseYear) * 12 + (targetMonth - baseMonth);
  const sequenceValue = DOC_SEQUENCE_START + monthOffset * DOC_SEQUENCE_STEP;

  if (monthOffset < 0 || sequenceValue <= 0) {
    throw new Error("문서번호 기준 월보다 이전 정산월은 공문 번호를 계산할 수 없습니다.");
  }

  return `${targetYear}-${String(sequenceValue).padStart(3, "0")}`;
}

export async function generateSettlementNoticePdf(month: string, payoutAmount: number) {
  const docNo = getDocumentNumber(month);

  const response = await fetch(APPS_SCRIPT_NOTICE_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      month,
      payoutAmount,
      docNo,
    }),
    cache: "no-store",
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(20000),
  });

  const result = (await response.json()) as AppsScriptNoticeResponse;

  if (!response.ok || !result.ok) {
    throw new Error(result.error ?? "Apps Script 공문 생성에 실패했습니다.");
  }

  return {
    docNo,
    fileName: result.fileName ?? `lotte-settlement-notice-${month}-${docNo}.pdf`,
    documentId: result.documentId ?? "",
    documentUrl: result.documentUrl ?? "",
    pdfFileId: result.pdfFileId ?? "",
    pdfUrl: result.pdfUrl ?? "",
  };
}

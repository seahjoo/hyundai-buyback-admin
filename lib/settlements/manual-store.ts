import fs from "node:fs/promises";
import path from "node:path";
import { MONTHLY_SETTLEMENT_SEEDS, type MonthlySettlementSeed } from "@/lib/settlements/manual-data";

export interface ManualSettlementMonthEntry {
  payoutAmount: number;
  confirmed: boolean;
  confirmedAt?: string;
}

export interface ManualSettlementStore {
  months: Record<string, ManualSettlementMonthEntry>;
}

const STORE_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(STORE_DIR, "settlements-manual.json");

function buildSeedStore(): ManualSettlementStore {
  return {
    months: Object.fromEntries(
      MONTHLY_SETTLEMENT_SEEDS.map((item: MonthlySettlementSeed) => [
        item.month,
        {
          payoutAmount: item.payoutAmount,
          confirmed: true,
          confirmedAt: "seed",
        },
      ]),
    ),
  };
}

function mergeWithSeedStore(store: Partial<ManualSettlementStore> | null | undefined) {
  const seed = buildSeedStore();
  return {
    months: {
      ...seed.months,
      ...(store?.months ?? {}),
    },
  } satisfies ManualSettlementStore;
}

export async function readManualSettlementStore() {
  try {
    const text = await fs.readFile(STORE_PATH, "utf8");
    return mergeWithSeedStore(JSON.parse(text) as ManualSettlementStore);
  } catch {
    return buildSeedStore();
  }
}

export async function writeManualSettlementStore(store: ManualSettlementStore) {
  await fs.mkdir(STORE_DIR, { recursive: true });
  await fs.writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export async function confirmManualSettlementMonth(month: string, payoutAmount: number) {
  const store = await readManualSettlementStore();
  store.months[month] = {
    payoutAmount,
    confirmed: true,
    confirmedAt: new Date().toISOString(),
  };
  await writeManualSettlementStore(store);
  return store;
}

export async function unlockManualSettlementMonth(month: string) {
  const store = await readManualSettlementStore();
  const current = store.months[month] ?? { payoutAmount: 0, confirmed: false };
  store.months[month] = {
    ...current,
    confirmed: false,
    confirmedAt: current.confirmedAt,
  };
  await writeManualSettlementStore(store);
  return store;
}

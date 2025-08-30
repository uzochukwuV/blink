import { NextRequest, NextResponse } from "next/server";
import { kv } from "~/lib/kv";
import { Bet } from "~/lib/types";

// Mock user for now
const userId = "user-demo";
function getKey(status: "open" | "completed") {
  return `bets:${userId}:${status}`;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { result, payout } = await req.json();
  if (!["won", "lost"].includes(result)) {
    return NextResponse.json({ error: "Invalid result" }, { status: 400 });
  }

  const openBets: Bet[] = (await kv.get(getKey("open"))) || [];
  const completedBets: Bet[] = (await kv.get(getKey("completed"))) || [];

  const idx = openBets.findIndex((b) => b.id === params.id);
  if (idx === -1) {
    return NextResponse.json({ error: "Bet not found" }, { status: 404 });
  }
  const bet = openBets[idx];
  openBets.splice(idx, 1);
  const settled: Bet = {
    ...bet,
    status: "completed",
    result,
    payout: Number(payout),
  };
  completedBets.unshift(settled);

  await kv.set(getKey("open"), openBets);
  await kv.set(getKey("completed"), completedBets);

  return NextResponse.json(settled);
}
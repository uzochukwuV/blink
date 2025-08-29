import { NextRequest, NextResponse } from "next/server";
import { kv } from "~/lib/kv";
import { realtimeService } from "~/lib/websocket";
import { analyticsService } from "~/lib/analytics";
import { blinkContract } from "~/lib/contracts";

// Legacy KV key helpers (kept for backward compatibility)
const demoUserId = "user-demo";
function getKey(status: "open" | "completed") {
  return `bets:${demoUserId}:${status}`;
}

// GET /api/bets
// If ?address=0x... is provided, fetch onchain bets from Blink contract.
// Otherwise, fall back to legacy KV mock (for development).
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const marketId = url.searchParams.get("marketId");
    const status = url.searchParams.get("status") === "completed" ? "completed" : "open";
    const address = url.searchParams.get("address") as `0x${string}` | null;

    if (address) {
      const onchain = await blinkContract.getUserBets(address, limit);
      const filtered = marketId
        ? onchain.filter((b) => String(b.marketId) === String(marketId))
        : onchain;

      // Normalize to API shape (read-only)
      const data = filtered.map((b) => ({
        id: String(b.id),
        marketId: String(b.marketId),
        userAddress: b.bettor,
        amount: Number(b.amount) / 1e6,
        side: b.outcome ? "yes" : "no",
        status: b.settled ? "completed" : "open",
        payout: Number(b.payout) / 1e6,
        createdAt: new Date(b.timestamp * 1000).toISOString(),
      }));

      return NextResponse.json({
        success: true,
        data,
        source: "onchain",
        pagination: { limit, total: data.length },
      });
    }

    // Fallback to KV (legacy)
    const userId = url.searchParams.get("userId") || demoUserId;
    let bets: any[] = (await kv.get(`bets:${userId}:${status}`)) || [];

    if (marketId) {
      bets = bets.filter((bet) => bet.marketId === marketId);
    }
    bets = bets.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: bets,
      source: "kv",
      pagination: { limit, total: bets.length },
    });
  } catch (error) {
    console.error("Error fetching bets:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch bets" },
      { status: 500 }
    );
  }
}

// POST /api/bets is no longer supported for placing real bets.
// Place bets from the client using Base Account or a connected wallet.
export async function POST(req: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error:
        "Server-side bet placement disabled. Use client wallet with Base Account to place bets onchain.",
    },
    { status: 405 }
  );
}
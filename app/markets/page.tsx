"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAccount, useWalletClient } from "wagmi";
import { MobileShell } from "~/components/ui/MobileShell";
import { TopBar } from "~/components/ui/TopBar";
import { PillButton } from "~/components/ui/PillButton";
import { SearchBar } from "~/components/ui/SearchBar";
import { SegmentedControl } from "~/components/ui/SegmentedControl";
import { useDebouncedValue } from "~/hooks/useDebouncedValue";
import { BetModal } from "~/components/ui/BetModal";
import { ListSkeleton } from "~/components/ui/ListSkeleton";
import { EmptyState } from "~/components/ui/EmptyState";
import { blinkContract, formatTimeRemaining, publicClient } from "~/lib/contracts";
import { CreateMarketModal } from "~/components/ui/CreateMarketModal";

type MarketItem = {
  id: number;
  type: number;
  title: string;
  targetId: string;
  threshold: number;
  deadline: number;
  status: number;
  yesPool: number;
  noPool: number;
  totalVolume: number;
  creatorStake: number;
  creator: string;
  odds: { yes: number; no: number };
  currentMetrics?: any;
};

function segmentToTypeString(segment: number): string | undefined {
  switch (segment) {
    case 1:
      return "VIRAL_CAST";
    case 2:
      return "POLL_OUTCOME";
    case 3:
      return "CHANNEL_GROWTH";
    case 4:
      return "CREATOR_MILESTONE";
    default:
      return undefined;
  }
}

export default function MarketsPage() {
  const [segment, setSegment] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [data, setData] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ id: string; title: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [txStatus, setTxStatus] = useState<{ stage: "idle" | "submitting" | "submitted" | "confirmed" | "error"; hash?: `0x${string}`; error?: string; }>({ stage: "idle" });
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const typeFilter = useMemo(() => segmentToTypeString(segment), [segment]);

  const fetchMarkets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set("type", typeFilter);
      const response = await fetch(`/api/markets?${params.toString()}`);
      const result = await response.json();
      let markets: MarketItem[] = result?.data || [];
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        markets = markets.filter((m) => m.title.toLowerCase().includes(q));
      }
      setData(markets);
    } catch (err) {
      setError("Failed to fetch markets");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, typeFilter]);

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  return (
    <MobileShell
      activeTab="markets"
      topBar={
        <TopBar
          title="Markets"
          actionSlot={
            <div className="flex gap-2">
              <PillButton className="px-3 py-1 text-sm" onClick={() => setShowCreate(true)}>
                Create
              </PillButton>
              <Link href="/markets/farcaster">
                <PillButton className="px-3 py-1 text-sm">Farcaster</PillButton>
              </Link>
            </div>
          }
        />
      }
    >
      <div className="p-4 pb-24">
        {txStatus.stage !== "idle" && (
          <div className="mb-3 text-sm rounded-md px-3 py-2 border"
               style={{ borderColor: "var(--border)" }}>
            {txStatus.stage === "submitting" && "Submitting transaction..."}
            {txStatus.stage === "submitted" && (
              <span>Transaction submitted: <span className="font-mono">{txStatus.hash}</span></span>
            )}
            {txStatus.stage === "confirmed" && "Transaction confirmed. Updating markets..."}
            {txStatus.stage === "error" && <span className="text-danger">{txStatus.error}</span>}
          </div>
        )}

        <SearchBar
          placeholder="Search markets"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <SegmentedControl
          options={["All", "Viral Cast", "Poll", "Channel", "Creator"]}
          value={segment}
          onChange={setSegment}
        />
        {loading ? (
          <ListSkeleton count={6} />
        ) : error ? (
          <div className="bg-danger/10 text-danger rounded p-2 mb-2">{error}</div>
        ) : data.length === 0 ? (
          <EmptyState label="No markets found." />
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {data.map((m) => (
              <div key={m.id} className="bg-card rounded-lg p-4 border border-borderSubtle">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-textPrimary">{m.title}</div>
                    <div className="text-xs text-textSecondary">
                      Yes: {m.odds.yes.toFixed(2)}x • No: {m.odds.no.toFixed(2)}x • Ends in {formatTimeRemaining(m.deadline)}
                    </div>
                    <div className="text-xs text-textSecondary mt-1">
                      Pools • Yes: {m.yesPool.toFixed(2)} USDC • No: {m.noPool.toFixed(2)} USDC • Vol: {m.totalVolume.toFixed(2)} USDC
                    </div>
                  </div>
                  <PillButton
                    className="bg-primary hover:bg-primary-dark text-white px-5"
                    onClick={() => setModal({ id: String(m.id), title: m.title })}
                  >
                    Bet
                  </PillButton>
                </div>
              </div>
            ))}
          </div>
        )}
        {modal && (
          <BetModal
            open={!!modal}
            onClose={() => setModal(null)}
            market={modal}
            onSubmit={async ({ amount, side }) => {
              if (!address) throw new Error("Connect a wallet or Base Account");
              const marketId = parseInt(modal.id, 10);
              setTxStatus({ stage: "submitting" });
              try {
                const hash = await blinkContract.placeBet({
                  walletClient,
                  userAddress: address,
                  marketId,
                  outcome: side === "yes",
                  usdcAmount: amount,
                });
                setTxStatus({ stage: "submitted", hash });
                setModal(null);
                await publicClient.waitForTransactionReceipt({ hash });
                setTxStatus({ stage: "confirmed", hash });
                await fetchMarkets();
                setTimeout(() => setTxStatus({ stage: "idle" }), 2500);
              } catch (e: any) {
                setTxStatus({ stage: "error", error: e?.message || "Transaction failed" });
              }
            }}
          />
        )}
        {showCreate && (
          <CreateMarketModal
            open={showCreate}
            onClose={() => setShowCreate(false)}
            onCreated={async (hash) => {
              setTxStatus({ stage: "submitted", hash });
              setShowCreate(false);
              try {
                await publicClient.waitForTransactionReceipt({ hash });
                setTxStatus({ stage: "confirmed", hash });
                await fetchMarkets();
                setTimeout(() => setTxStatus({ stage: "idle" }), 2500);
              } catch (e: any) {
                setTxStatus({ stage: "error", error: e?.message || "Transaction failed" });
              }
            }}
          />
        )}
      </div>
    </MobileShell>
  );
}
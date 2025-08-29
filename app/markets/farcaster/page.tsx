"use client";
import React, { useState, useEffect } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { MobileShell } from "~/components/ui/MobileShell";
import { TopBar } from "~/components/ui/TopBar";
import { SegmentedControl } from "~/components/ui/SegmentedControl";
import { PillButton } from "~/components/ui/PillButton";
import { SearchBar } from "~/components/ui/SearchBar";
import { useDebouncedValue } from "~/hooks/useDebouncedValue";
import { BetModal } from "~/components/ui/BetModal";
import { ListSkeleton } from "~/components/ui/ListSkeleton";
import { EmptyState } from "~/components/ui/EmptyState";
import { blinkContract, formatTimeRemaining } from "~/lib/contracts";
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
};

export default function FarcasterMarketsPage() {
  const [segment, setSegment] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [data, setData] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ id: string; title: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const fetchMarkets = async () => {
      try {
        // Filter to Channel Growth type
        const response = await fetch(`/api/markets?type=CHANNEL_GROWTH`);
        const result = await response.json();
        if (active) {
          let markets: MarketItem[] = result?.data || [];
          if (debouncedSearch) {
            const q = debouncedSearch.toLowerCase();
            markets = markets.filter((m) => m.title.toLowerCase().includes(q));
          }
          setData(markets);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError("Failed to fetch markets");
          setData([]);
          setLoading(false);
        }
      }
    };

    fetchMarkets();
    return () => {
      active = false;
    };
  }, [debouncedSearch]);

  return (
    <MobileShell activeTab="markets" topBar={<TopBar title="Farcaster Markets" backHref="/markets" />}>
      <div className="p-4 pb-24">
        <div className="mb-1">
          <div className="font-bold text-xl">Channel Growth Bets</div>
          <div className="text-textSecondary text-base">
            Bet on which Farcaster channels will grow fastest this week.
          </div>
        </div>
        <SearchBar
          placeholder="Search markets"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <SegmentedControl
          options={["Followers", "Engagement", "Other"]}
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
                    className="bg-primary hover:bg-primary-dark text-white px-4 py-1 text-xs mt-1"
                    onClick={() => setModal({ id: String(m.id), title: m.title })}
                  >
                    Bet
                  </PillButton>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-6 mb-6">
          <PillButton className="w-full bg-primary hover:bg-primary-dark text-white" onClick={() => setShowCreate(true)}>
            Create Market
          </PillButton>
        </div>
        {modal && (
          <BetModal
            open={!!modal}
            onClose={() => setModal(null)}
            market={modal}
            onSubmit={async ({ amount, side }) => {
              if (!address) throw new Error("Connect a wallet or Base Account");
              const marketId = parseInt(modal.id, 10);
              const hash = await blinkContract.placeBet({
                walletClient,
                userAddress: address,
                marketId,
                outcome: side === "yes",
                usdcAmount: amount,
              });
              window.dispatchEvent(new CustomEvent("new-bet", { detail: { txHash: hash } }));
              setModal(null);
            }}
          />
        )}
        {showCreate && (
          <CreateMarketModal
            open={showCreate}
            onClose={() => setShowCreate(false)}
            onCreated={() => {
              setShowCreate(false);
              setTimeout(() => location.reload(), 300);
            }}
          />
        )}
      </div>
    </MobileShell>
  );
}
"use client";
import React, { useState, useEffect } from "react";
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
import { Creator } from "~/lib/types";
import { blinkContract } from "~/lib/contracts";

export default function MarketsPage() {
  const [segment, setSegment] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [data, setData] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ id: string; title: string } | null>(null);
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const fetchCreators = async () => {
      try {
        const params = new URLSearchParams();
        if (debouncedSearch) {
          params.append("search", debouncedSearch);
        }

        const response = await fetch(`/api/markets/creators?${params}`);
        const result = await response.json();

        if (active) {
          setData(result.data || []);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError("Failed to fetch creators");
          setData([]);
          setLoading(false);
        }
      }
    };

    fetchCreators();
    return () => {
      active = false;
    };
  }, [debouncedSearch]);

  return (
    <MobileShell
      activeTab="markets"
      topBar={
        <TopBar
          title="Creator Bets"
          actionSlot={
            <Link href="/markets/farcaster">
              <PillButton className="px-3 py-1 text-sm">Farcaster</PillButton>
            </Link>
          }
        />
      }
    >
      <div className="p-4 pb-24">
        <SearchBar
          placeholder="Search creators"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <SegmentedControl
          options={["Trending", "Popular", "New"]}
          value={segment}
          onChange={setSegment}
        />
        {loading ? (
          <ListSkeleton count={6} />
        ) : error ? (
          <div className="bg-danger/10 text-danger rounded p-2 mb-2">{error}</div>
        ) : data.length === 0 ? (
          <EmptyState label="No creators found." />
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {data.map((c) => (
              <div key={c.id} className="bg-card rounded-lg p-4 border border-borderSubtle">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {c.pfpUrl ? (
                      <img
                        src={c.pfpUrl}
                        alt={c.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white font-semibold">
                        {c.avatarInitials}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-textPrimary flex items-center gap-2">
                        {c.name}
                        {c.verified && <span className="text-primary text-sm">✓</span>}
                      </div>
                      <div className="text-textSecondary text-sm">
                        {c.username && `@${c.username} • `}
                        {c.followers.toLocaleString()} followers
                      </div>
                      {c.bio && (
                        <div className="text-textSecondary text-xs mt-1 line-clamp-2">{c.bio}</div>
                      )}
                    </div>
                  </div>
                  <PillButton
                    className="bg-primary hover:bg-primary-dark text-white px-6"
                    onClick={() => setModal({ id: c.id, title: c.name })}
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
              if (!Number.isFinite(marketId)) {
                throw new Error("Invalid market id");
              }
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
      </div>
    </MobileShell>
  );
}
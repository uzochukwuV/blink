"use client";
import React, { useState, useEffect } from "react";
import { MobileShell } from "~/components/ui/MobileShell";
import { TopBar } from "~/components/ui/TopBar";
import { SegmentedControl } from "~/components/ui/SegmentedControl";
import { ListItem } from "~/components/ui/ListItem";
import { PillButton } from "~/components/ui/PillButton";
import { TimeTiles } from "~/components/ui/TimeTiles";
import { SearchBar } from "~/components/ui/SearchBar";
import { useDebouncedValue } from "~/hooks/useDebouncedValue";
import { BetModal } from "~/components/ui/BetModal";
import { ListSkeleton } from "~/components/ui/ListSkeleton";
import { EmptyState } from "~/components/ui/EmptyState";
// removed mock imports
import { Channel } from "~/lib/types";

export default function FarcasterMarketsPage() {
  const [segment, setSegment] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [data, setData] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    
    const fetchChannels = async () => {
      try {
        const params = new URLSearchParams();
        if (debouncedSearch) {
          params.append('search', debouncedSearch);
        }
        
        const response = await fetch(`/api/markets/channels?${params}`);
        const result = await response.json();
        
        if (active) {
          setData(result.data || []);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError('Failed to fetch channels');
          setData([]);
          setLoading(false);
        }
      }
    };

    fetchChannels();
    return () => { active = false; };
  }, [debouncedSearch]);

  return (
    <MobileShell
      activeTab="markets"
      topBar={<TopBar title="Farcaster Bets" backHref="/markets" />}
    >
      <div className="p-4 pb-24">
        <div className="mb-1">
          <div className="font-bold text-xl">Channel Growth Bets</div>
          <div className="text-textSecondary text-base">
            Bet on which Farcaster channels will grow fastest this week.
          </div>
        </div>
        <SearchBar
          placeholder="Search channels"
          value={search}
          onChange={e => setSearch(e.target.value)}
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
          <EmptyState label="No channels found." />
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {data.map((c) => (
              <div key={c.id} className="bg-card rounded-lg p-4 border border-borderSubtle">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {c.imageUrl ? (
                      <img 
                        src={c.imageUrl} 
                        alt={c.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white font-semibold text-xs">
                        {c.avatarInitials}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-textPrimary">{c.name}</div>
                      <div className="text-textSecondary text-sm">{c.followers.toLocaleString()} followers</div>
                      {c.description && (
                        <div className="text-textSecondary text-xs mt-1 line-clamp-1">{c.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-success font-semibold">+{c.growth}%</div>
                    <PillButton 
                      className="bg-primary hover:bg-primary-dark text-white px-4 py-1 text-xs mt-1"
                      onClick={() => setModal({ id: c.id, title: c.name })}
                    >
                      Bet
                    </PillButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-6 mb-6">
          <div className="text-textPrimary font-semibold mb-3">Time Remaining</div>
          <TimeTiles
            tiles={[
              { label: "Days", value: "2" },
              { label: "Hours", value: "12" },
              { label: "Minutes", value: "30" },
              { label: "Seconds", value: "45" },
            ]}
          />
        </div>
        <PillButton className="w-full bg-primary hover:bg-primary-dark text-white">Place Bet</PillButton>
        {modal && (
          <BetModal
            open={!!modal}
            onClose={() => setModal(null)}
            market={modal}
            onSubmit={async (payload) => {
              const resp = await fetch("/api/bets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  marketId: modal.id,
                  marketTitle: modal.title,
                  ...payload,
                }),
              });
              const bet = await resp.json();
              window.dispatchEvent(new CustomEvent("new-bet", { detail: bet }));
              setModal(null);
            }}
          />
        )}
      </div>
    </MobileShell>
  );
}
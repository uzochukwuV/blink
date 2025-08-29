"use client";
import React, { useState } from "react";
import Link from "next/link";
import { MobileShell } from "~/components/ui/MobileShell";
import { TopBar } from "~/components/ui/TopBar";
import { PillButton } from "~/components/ui/PillButton";
import { SegmentedControl } from "~/components/ui/SegmentedControl";
import { ListItem } from "~/components/ui/ListItem";
import { BetModal } from "~/components/ui/BetModal";
import { ListSkeleton } from "~/components/ui/ListSkeleton";
import { EmptyState } from "~/components/ui/EmptyState";
import { ProgressBar } from "~/components/ui/ProgressBar";
// removed mock imports
import '../globals.css'

const PlusIcon = (
  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 6v12M6 12h12"/>
  </svg>
);

export default function BetsPage() {
  const [segment, setSegment] = useState(0);
  const [modal, setModal] = useState<{ marketId: string; marketTitle: string } | null>(null);

  // No mock data; show empty until wired to real data
  const pollBets: any[] = [];

  const completedBets = [
    { id: 1, marketTitle: "Debate Outcome", subtitle: "Who will win the next debate?", status: "Won", amount: 50 },
    { id: 2, marketTitle: "Product Launch Success", subtitle: "Will the new product launch be successful?", status: "Lost", amount: -30 },
    { id: 3, marketTitle: "Follower Count", subtitle: "Who will have the most followers by the end of the year?", status: "Won", amount: 75 },
    { id: 4, marketTitle: "Feature Reception", subtitle: "Will the new feature be well-received by users?", status: "Lost", amount: -20 }
  ];

  const list = segment === 0 ? pollBets : completedBets;

  return (
    <MobileShell
      activeTab="bets"
      topBar={
        <TopBar
          title="Bets"
          actionSlot={
            <Link href="/bets/polls" aria-label="Bets Polls">
              {PlusIcon}
            </Link>
          }
        />
      }
    >
      <div className="p-4 pb-24">
        <SegmentedControl
          options={["Open", "Completed"]}
          value={segment}
          onChange={setSegment}
        />
        <div className="mt-4 flex flex-col gap-4">
          {segment === 0 ? (
            // Poll Bets Display (like design mockup)
            list.map((poll, i) => (
              <div key={i} className="bg-card rounded-lg p-4 border border-borderSubtle">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center text-white font-semibold">
                    {poll.handle.charAt(1).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-textPrimary mb-1">{poll.marketTitle}</div>
                    <div className="text-textSecondary text-sm mb-3">Poll by {poll.handle}</div>
                    
                    <div className="text-textSecondary text-sm mb-2">{poll.percent}% voted</div>
                    <ProgressBar percent={poll.percent} className="mb-3" />
                    
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-textPrimary font-medium">Yes</span>
                      <span className="text-textSecondary">{poll.yesOdds}x</span>
                    </div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-textPrimary font-medium">No</span>
                      <span className="text-textSecondary">{poll.noOdds}x</span>
                    </div>
                    
                    <div className="text-textSecondary text-xs mb-3">Ends in {poll.time}</div>
                    
                    <PillButton 
                      className="w-full bg-accent hover:bg-accent/90 text-white"
                      onClick={() => setModal({ marketId: i.toString(), marketTitle: poll.marketTitle })}
                    >
                      Place Bet
                    </PillButton>
                  </div>
                </div>
              </div>
            ))
          ) : (
            // Completed Bets Display
            list.map((bet, i) => (
              <div key={i} className="bg-card rounded-lg p-4 border border-borderSubtle">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-semibold">
                    {bet.marketTitle.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-textPrimary mb-1">{bet.marketTitle}</div>
                    <div className="text-textSecondary text-sm">{bet.subtitle}</div>
                  </div>
                  <div className={`font-semibold ${
                    bet.amount > 0 ? 'text-success' : 'text-danger'
                  }`}>
                    {bet.amount > 0 ? '+' : ''}${bet.amount}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
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
                  marketId: modal.marketId,
                  marketTitle: modal.marketTitle,
                  ...payload,
                }),
              });
              const bet = await resp.json();
              window.dispatchEvent(new CustomEvent("new-bet", { detail: bet }));
              setModal(null);
              setOpenBets(prev => [bet, ...prev]);
            }}
          />
        )}
      </div>
    </MobileShell>
  );
}
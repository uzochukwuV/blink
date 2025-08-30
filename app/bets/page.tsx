"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { MobileShell } from "~/components/ui/MobileShell";
import { TopBar } from "~/components/ui/TopBar";
import { PillButton } from "~/components/ui/PillButton";
import { SegmentedControl } from "~/components/ui/SegmentedControl";
import { BetModal } from "~/components/ui/BetModal";
import { ListSkeleton } from "~/components/ui/ListSkeleton";
import { useBets } from "~/hooks/useBets";
import { Bet } from "~/lib/types";
import '../globals.css';

const PlusIcon = (
  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 6v12M6 12h12"/>
  </svg>
);

export default function BetsPage() {
  const [segment, setSegment] = useState(0);
  const [modal, setModal] = useState<{ marketId: string; marketTitle: string } | null>(null);
  const { address, isConnected } = useAccount();

  // Fetch bets based on current segment
  const { bets: openBets, loading: openBetsLoading, error: openBetsError, refresh: refreshOpenBets } = useBets({
    status: 'open',
    limit: 50
  });

  const { bets: completedBets, loading: completedBetsLoading, error: completedBetsError, refresh: refreshCompletedBets } = useBets({
    status: 'completed',
    limit: 50
  });

  const currentBets = segment === 0 ? openBets : completedBets;
  const currentLoading = segment === 0 ? openBetsLoading : completedBetsLoading;
  const currentError = segment === 0 ? openBetsError : completedBetsError;

  // Refresh bets when a new bet is placed
  useEffect(() => {
    const handleNewBet = () => {
      refreshOpenBets();
    };

    window.addEventListener("new-bet", handleNewBet);
    return () => window.removeEventListener("new-bet", handleNewBet);
  }, [refreshOpenBets]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getBetStatusColor = (bet: Bet) => {
    if (bet.status === 'open') return 'text-blue-500';
    if (bet.result === 'won') return 'text-green-500';
    if (bet.result === 'lost') return 'text-red-500';
    return 'text-gray-500';
  };

  const getBetStatusText = (bet: Bet) => {
    if (bet.status === 'open') return 'Active';
    if (bet.result === 'won') return 'Won';
    if (bet.result === 'lost') return 'Lost';
    return 'Settled';
  };

  const renderBetCard = (bet: Bet, index: number) => (
    <div key={bet.id} className="bg-card rounded-lg p-4 border border-borderSubtle">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-semibold">
          {bet.marketTitle?.charAt(0) || 'B'}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-textPrimary mb-1">
            {bet.marketTitle || `Bet #${bet.id}`}
          </div>
          <div className="text-textSecondary text-sm mb-2">
            {bet.side === 'yes' ? 'Yes' : 'No'} • {formatAmount(bet.amount)}
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className={`text-sm font-medium ${getBetStatusColor(bet)}`}>
              {getBetStatusText(bet)}
            </span>
            <span className="text-textSecondary text-sm">
              {formatDate(bet.createdAt)}
            </span>
          </div>
          {bet.payout && bet.status === 'completed' && (
            <div className={`text-sm font-semibold ${
              bet.payout > 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {bet.payout > 0 ? '+' : ''}{formatAmount(bet.payout)}
            </div>
          )}
          {bet.notes && (
            <div className="text-textSecondary text-sm mt-2 italic">
              &ldquo;{bet.notes}&rdquo;
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderEmptyState = () => (
    <div className="w-full flex flex-col items-center justify-center py-16 text-textSecondary">
      <div className="mb-4">
        <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
          <circle cx="16" cy="16" r="14" /><path d="M10 16l4 4 8-8"/>
        </svg>
      </div>
      <div className="text-base font-medium mb-2">
        {segment === 0 ? "No Active Bets" : "No Completed Bets"}
      </div>
      <div className="text-sm text-center mb-4">
        {segment === 0 
          ? "You haven't placed any active bets yet. Start betting on markets to see them here."
          : "Your completed bets will appear here once they're settled."
        }
      </div>
      {segment === 0 && (
        <Link href="/markets">
          <PillButton className="bg-accent hover:bg-accent/90 text-white">
            Browse Markets
          </PillButton>
        </Link>
      )}
    </div>
  );

  const renderErrorState = (error: string) => (
    <div className="text-center py-8">
      <div className="text-red-500 text-sm mb-4">{error}</div>
      <PillButton 
        onClick={() => segment === 0 ? refreshOpenBets() : refreshCompletedBets()}
        className="bg-accent hover:bg-accent/90 text-white"
      >
        Try Again
      </PillButton>
    </div>
  );

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
          {!isConnected ? (
            <div className="text-center py-8">
              <div className="text-textSecondary text-sm mb-4">
                Connect your wallet to view your bets
              </div>
            </div>
          ) : currentLoading ? (
            <ListSkeleton count={3} />
          ) : currentError ? (
            renderErrorState(currentError)
          ) : currentBets.length === 0 ? (
            renderEmptyState()
          ) : (
            currentBets.map((bet, index) => renderBetCard(bet, index))
          )}
        </div>

        {modal && (
          <BetModal
            open={!!modal}
            onClose={() => setModal(null)}
            market={modal}
            onSubmit={async (payload) => {
              // Note: This modal is kept for compatibility but bet placement
              // should be handled through the wallet/contract directly
              console.log('Bet placement payload:', payload);
              setModal(null);
              // Refresh bets after successful placement
              refreshOpenBets();
            }}
          />
        )}
      </div>
    </MobileShell>
  );
}
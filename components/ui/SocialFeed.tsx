import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { SocialBet, FollowingBettor, socialBettingService } from '~/lib/socialBetting';

interface SocialFeedProps {
  userFid: number;
  className?: string;
}

export function SocialFeed({ userFid, className = '' }: SocialFeedProps) {
  const [feedItems, setFeedItems] = useState<SocialBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState<FollowingBettor[]>([]);

  useEffect(() => {
    const loadFeedData = async () => {
      try {
        const [feed, followingList] = await Promise.all([
          socialBettingService.getSocialFeed(userFid, 20),
          // Mock following list
          Promise.resolve([
            {
              fid: 123,
              username: 'viral_prophet',
              displayName: 'Viral Prophet',
              profilePicture: 'https://example.com/avatar1.jpg',
              totalBets: 156,
              winRate: 0.73,
              totalProfit: 1250.50,
              followedAt: new Date(),
              isVerified: true,
              specialization: 'viral_content'
            }
          ] as FollowingBettor[])
        ]);
        
        setFeedItems(feed);
        setFollowing(followingList);
      } catch (error) {
        console.error('Error loading social feed:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFeedData();
  }, [userFid]);

  const handleCopyBet = async (originalBetId: string, amount: number) => {
    const success = await socialBettingService.copyBet(userFid, originalBetId, amount);
    if (success) {
      // Show success message
      alert('Bet copied successfully!');
    }
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-xl p-4 border border-border animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-muted"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-32 mb-1"></div>
                  <div className="h-3 bg-muted rounded w-24"></div>
                </div>
              </div>
              <div className="h-4 bg-muted rounded w-full mb-2"></div>
              <div className="h-3 bg-muted rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Following Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-3">Following</h3>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {following.map((bettor) => (
            <div key={bettor.fid} className="flex-shrink-0">
              <div className="bg-card rounded-lg p-3 border border-border min-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-xs font-semibold">
                    {bettor.displayName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium text-card-foreground text-sm">{bettor.displayName}</div>
                    <div className="text-muted-foreground text-xs">@{bettor.username}</div>
                  </div>
                  {bettor.isVerified && <span className="text-blue-500">✓</span>}
                </div>
                <div className="text-xs text-muted-foreground">
                  <div>{bettor.winRate.toLocaleString('en', { style: 'percent' })} win rate</div>
                  <div>+${bettor.totalProfit.toFixed(2)} profit</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Social Feed */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Activity Feed</h3>
        
        {feedItems.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-4">No activity from followed bettors</div>
            <Link href="/discover" className="btn btn-primary">
              Discover Bettors to Follow
            </Link>
          </div>
        ) : (
          feedItems.map((item) => (
            <SocialBetCard
              key={item.id}
              bet={item}
              onCopy={handleCopyBet}
              currentUserFid={userFid}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface SocialBetCardProps {
  bet: SocialBet;
  onCopy: (betId: string, amount: number) => void;
  currentUserFid: number;
}

function SocialBetCard({ bet, onCopy, currentUserFid }: SocialBetCardProps) {
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyAmount, setCopyAmount] = useState(bet.amount);

  const timeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="bg-card rounded-xl p-4 border border-border hover:shadow-md hover:shadow-primary/5 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-sm font-semibold">
            U
          </div>
          <div>
            <div className="font-medium text-card-foreground">@user{bet.bettor}</div>
            <div className="text-muted-foreground text-xs">{timeAgo(bet.timestamp)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            bet.outcome ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {bet.outcome ? 'YES' : 'NO'}
          </span>
          <span className="text-sm font-semibold text-foreground">
            ${bet.amount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Market Info */}
      <div className="mb-3">
        <Link 
          href={`/markets/${bet.marketId}`}
          className="font-medium text-foreground hover:text-primary transition-colors"
        >
          Market #{bet.marketId}
        </Link>
        {bet.note && (
          <p className="text-muted-foreground text-sm mt-1">{bet.note}</p>
        )}
      </div>

      {/* Social Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-muted-foreground text-xs">
          <span>{bet.copiedBy.length} copies</span>
          <span>{bet.followers.length} followers</span>
          {bet.groupId && <span>In group</span>}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCopyModal(true)}
            className="px-3 py-1 bg-accent hover:bg-accent/80 text-accent-foreground rounded-lg text-xs font-medium transition-colors"
          >
            Copy Bet
          </button>
          <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Copy Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 max-w-sm w-full mx-4 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Copy Bet</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Amount (USDC)
              </label>
              <input
                type="number"
                value={copyAmount}
                onChange={(e) => setCopyAmount(parseFloat(e.target.value) || 0)}
                className="input w-full"
                min="1"
                max="1000"
                step="0.01"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowCopyModal(false)}
                className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onCopy(bet.betId, copyAmount);
                  setShowCopyModal(false);
                }}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Copy Bet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
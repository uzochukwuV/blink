import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LeaderboardEntry, Badge, Competition, socialBettingService } from '~/lib/socialBetting';

interface LeaderboardProps {
  className?: string;
  currentUserFid?: number;
}

export function Leaderboard({ className = '', currentUserFid }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly' | 'all-time'>('weekly');
  const [competitions, setCompetitions] = useState<Competition[]>([]);

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLoading(true);
      try {
        const leaderboardData = await socialBettingService.getLeaderboard(activeTab, undefined, 50);
        setEntries(leaderboardData);
        
        // Mock competitions data
        setCompetitions([
          {
            id: 'weekly_challenge',
            name: 'Weekly Prediction Challenge',
            description: 'Best performers this week',
            startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
            entryFee: 10,
            prizePool: 500,
            maxParticipants: 100,
            participants: [],
            rules: 'Highest profit wins',
            category: 'weekly',
            status: 'active',
            prizes: [
              { position: 1, amount: 250, title: 'Weekly Champion' },
              { position: 2, amount: 150, title: 'Runner-up' },
              { position: 3, amount: 100, title: 'Third Place' }
            ]
          }
        ]);
      } catch (error) {
        console.error('Error loading leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, [activeTab]);

  const getTrendIcon = (trend: LeaderboardEntry['trend']) => {
    switch (trend) {
      case 'up': return <span className="text-green-500">↗️</span>;
      case 'down': return <span className="text-red-500">↘️</span>;
      default: return <span className="text-gray-500">→</span>;
    }
  };

  const getBadgeIcon = (badge: Badge) => {
    const rarityColors = {
      common: 'text-gray-500',
      rare: 'text-blue-500',
      epic: 'text-purple-500',
      legendary: 'text-yellow-500'
    };
    
    return (
      <span className={`text-sm ${rarityColors[badge.rarity]}`} title={badge.description}>
        {badge.icon}
      </span>
    );
  };

  if (loading) {
    return (
      <div className={className}>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-card rounded-xl p-4 border border-border animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded bg-muted"></div>
                <div className="w-10 h-10 rounded-full bg-muted"></div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-32 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-24"></div>
                </div>
                <div className="text-right">
                  <div className="h-4 bg-muted rounded w-20 mb-1"></div>
                  <div className="h-3 bg-muted rounded w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Active Competitions */}
      {competitions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-3">🏆 Active Competitions</h3>
          <div className="space-y-3">
            {competitions.filter(c => c.status === 'active').map((competition) => (
              <div key={competition.id} className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-foreground">{competition.name}</h4>
                  <div className="text-sm font-medium text-primary">
                    ${competition.prizePool} Prize Pool
                  </div>
                </div>
                <p className="text-muted-foreground text-sm mb-3">{competition.description}</p>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {competition.participants.length}/{competition.maxParticipants} participants
                  </div>
                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                    Join Competition
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time Period Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {(['daily', 'weekly', 'monthly', 'all-time'] as const).map((period) => (
          <button
            key={period}
            onClick={() => setActiveTab(period)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === period
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {period.charAt(0).toUpperCase() + period.slice(1).replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      <div className="space-y-3">
        {entries.map((entry, index) => {
          const isCurrentUser = currentUserFid === entry.fid;
          const rankDisplay = entry.rank <= 3 ? 
            ['🥇', '🥈', '🥉'][entry.rank - 1] : 
            `#${entry.rank}`;

          return (
            <div
              key={entry.fid}
              className={`bg-card rounded-xl p-4 border transition-all duration-300 ${
                isCurrentUser 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:shadow-md hover:shadow-primary/5'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className="text-center min-w-[40px]">
                  <div className="text-lg font-bold">{rankDisplay}</div>
                  {getTrendIcon(entry.trend)}
                </div>

                {/* Avatar */}
                <div className="relative">
                  {entry.profilePicture ? (
                    <img
                      src={entry.profilePicture}
                      alt={entry.displayName}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white font-semibold">
                      {entry.displayName.charAt(0)}
                    </div>
                  )}
                  
                  {/* Badges overlay */}
                  {entry.badges.length > 0 && (
                    <div className="absolute -top-1 -right-1 flex">
                      {entry.badges.slice(0, 2).map((badge) => (
                        <div key={badge.id} className="bg-background rounded-full p-0.5 border border-border">
                          {getBadgeIcon(badge)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={`/profile/${entry.fid}`}
                      className="font-semibold text-foreground hover:text-primary transition-colors truncate"
                    >
                      {entry.displayName}
                    </Link>
                    {isCurrentUser && (
                      <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
                        You
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground text-sm">@{entry.username}</div>
                  
                  {/* Stats */}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{entry.totalBets} bets</span>
                    <span>{(entry.winRate * 100).toFixed(1)}% win rate</span>
                    {entry.winStreak > 0 && (
                      <span className="text-orange-500">🔥 {entry.winStreak}</span>
                    )}
                  </div>
                </div>

                {/* Score & Profit */}
                <div className="text-right">
                  <div className="text-lg font-bold text-foreground mb-1">
                    {entry.score.toLocaleString()}
                  </div>
                  <div className={`text-sm font-medium ${
                    entry.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {entry.totalProfit >= 0 ? '+' : ''}${entry.totalProfit.toFixed(2)}
                  </div>
                </div>

                {/* Follow Button */}
                <div className="ml-2">
                  <button className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Badges Display */}
              {entry.badges.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">Badges:</span>
                    {entry.badges.slice(0, 5).map((badge) => (
                      <div
                        key={badge.id}
                        className="flex items-center gap-1 px-2 py-1 bg-muted rounded-full text-xs"
                        title={badge.description}
                      >
                        {getBadgeIcon(badge)}
                        <span>{badge.name}</span>
                      </div>
                    ))}
                    {entry.badges.length > 5 && (
                      <span className="text-xs text-muted-foreground">
                        +{entry.badges.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {entries.length === 0 && (
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-4">No leaderboard data available</div>
            <p className="text-sm text-muted-foreground">
              Start betting to see your ranking!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
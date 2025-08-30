/**
 * Social Betting Features and Leaderboard System
 * Enhanced social features for community engagement
 */

import { Bet, Creator, FarcasterUser } from './types';

// Social betting interfaces
export interface BettingGroup {
  id: string;
  name: string;
  description: string;
  createdBy: number; // FID
  members: BettingGroupMember[];
  totalMembers: number;
  totalVolume: number;
  isPublic: boolean;
  inviteCode?: string;
  tags: string[];
  avatar?: string;
  createdAt: Date;
  rules?: string;
  minStake?: number; // Minimum USDC to join
}

export interface BettingGroupMember {
  fid: number;
  username: string;
  displayName: string;
  joinedAt: Date;
  role: 'admin' | 'moderator' | 'member';
  totalBets: number;
  totalWinnings: number;
  winRate: number;
  reputation: number; // 0-100 based on performance
  isActive: boolean;
}

export interface SocialBet {
  id: string;
  betId: string;
  marketId: string;
  bettor: number; // FID
  amount: number;
  outcome: boolean;
  timestamp: Date;
  isPublic: boolean;
  note?: string;
  followers: number[]; // FIDs following this bet
  copiedBy: number[]; // FIDs who copied this bet
  groupId?: string; // If posted to a group
}

export interface FollowingBettor {
  fid: number;
  username: string;
  displayName: string;
  profilePicture?: string;
  totalBets: number;
  winRate: number;
  totalProfit: number;
  followedAt: Date;
  isVerified: boolean;
  specialization?: string; // 'viral_content', 'creator_growth', etc.
}

// Leaderboard interfaces
export interface LeaderboardEntry {
  rank: number;
  fid: number;
  username: string;
  displayName: string;
  profilePicture?: string;
  score: number;
  totalBets: number;
  winRate: number;
  totalProfit: number;
  winStreak: number;
  badges: Badge[];
  trend: 'up' | 'down' | 'stable';
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt: Date;
  category: 'achievement' | 'milestone' | 'streak' | 'special';
}

export interface Competition {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  entryFee?: number; // USDC
  prizePool: number;
  maxParticipants: number;
  participants: CompetitionParticipant[];
  rules: string;
  category: string;
  status: 'upcoming' | 'active' | 'ended';
  prizes: Prize[];
}

export interface CompetitionParticipant {
  fid: number;
  username: string;
  displayName: string;
  joinedAt: Date;
  currentScore: number;
  currentRank: number;
  totalBets: number;
  winRate: number;
}

export interface Prize {
  position: number;
  amount: number; // USDC
  badge?: Badge;
  title?: string;
}

// Social analytics
export interface SocialMetrics {
  followers: number;
  following: number;
  copiedBets: number;
  influence: number; // 0-100 based on how often bets are copied
  communityRating: number; // 0-5 stars from other users
  totalTips: number; // USDC received from followers
  groupMemberships: number;
  competitionsWon: number;
}

// Chat and communication
export interface MarketChat {
  marketId: string;
  messages: ChatMessage[];
  participants: number; // Count of unique FIDs
  isLive: boolean;
  moderators: number[]; // FIDs
}

export interface ChatMessage {
  id: string;
  marketId: string;
  authorFid: number;
  username: string;
  displayName: string;
  message: string;
  timestamp: Date;
  type: 'message' | 'bet_placed' | 'prediction' | 'system';
  relatedBetId?: string;
  reactions: Reaction[];
  isDeleted: boolean;
  replyTo?: string; // Message ID
}

export interface Reaction {
  fid: number;
  emoji: string;
  timestamp: Date;
}

// Social betting service
export class SocialBettingService {
  /**
   * Follow another bettor to see their activity
   */
  async followBettor(followerFid: number, targetFid: number): Promise<boolean> {
    try {
      // Implementation would call API to follow user
      console.log(`${followerFid} following ${targetFid}`);
      return true;
    } catch (error) {
      console.error('Error following bettor:', error);
      return false;
    }
  }

  /**
   * Copy another user's bet
   */
  async copyBet(copierFid: number, originalBetId: string, amount: number): Promise<string | null> {
    try {
      // Get original bet details
      const originalBet = await this.getBetDetails(originalBetId);
      if (!originalBet) return null;

      // Place the same bet with different amount
      const newBetId = await this.placeBet({
        marketId: originalBet.marketId,
        bettor: copierFid,
        amount: amount,
        outcome: originalBet.outcome,
        isPublic: true,
        note: `Copied from @${originalBet.bettor}`
      });

      // Track the copy relationship
      await this.trackBetCopy(originalBetId, newBetId);
      
      return newBetId;
    } catch (error) {
      console.error('Error copying bet:', error);
      return null;
    }
  }

  /**
   * Create a betting group
   */
  async createBettingGroup(creatorFid: number, groupData: Partial<BettingGroup>): Promise<string | null> {
    try {
      const response = await fetch('/api/betting-groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userFid: creatorFid,
          ...groupData,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        return result.data.id;
      } else {
        console.error('Failed to create betting group:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Error creating betting group:', error);
      return null;
    }
  }

  /**
   * Get leaderboard for a specific time period
   */
  async getLeaderboard(
    period: 'daily' | 'weekly' | 'monthly' | 'all-time',
    category?: string,
    limit: number = 50
  ): Promise<LeaderboardEntry[]> {
    try {
      const params = new URLSearchParams({
        period,
        limit: limit.toString(),
      });

      if (category) {
        params.append('category', category);
      }

      const response = await fetch(`/api/leaderboard?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        console.error('Failed to fetch leaderboard:', result.error);
        return [];
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }

  /**
   * Get social feed of followed bettors' activity
   */
  async getSocialFeed(userFid: number, limit: number = 20): Promise<SocialBet[]> {
    try {
      const params = new URLSearchParams({
        userFid: userFid.toString(),
        limit: limit.toString(),
      });

      const response = await fetch(`/api/social-feed?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        console.error('Failed to fetch social feed:', result.error);
        return [];
      }
    } catch (error) {
      console.error('Error fetching social feed:', error);
      return [];
    }
  }

  }

  /**
   * Start a competition
   */
  async createCompetition(competitionData: Partial<Competition>): Promise<string | null> {
    try {
      const response = await fetch('/api/competitions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(competitionData),
      });

      const result = await response.json();
      
      if (result.success) {
        return result.data.id;
      } else {
        console.error('Failed to create competition:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Error creating competition:', error);
      return null;
    }
  }

  // Private helper methods
  private async getBetDetails(betId: string): Promise<SocialBet | null> {
    try {
      const response = await fetch(`/api/bets/${betId}`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching bet details:', error);
      return null;
    }
  }

  private async placeBet(betData: any): Promise<string> {
    try {
      const response = await fetch('/api/bets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(betData),
      });

      const result = await response.json();
      
      if (result.success) {
        return result.data.id;
      } else {
        throw new Error(result.error || 'Failed to place bet');
      }
    } catch (error) {
      console.error('Error placing bet:', error);
      throw error;
    }
  }

  private async trackBetCopy(originalBetId: string, copiedBetId: string): Promise<void> {
    try {
      await fetch('/api/bet-copies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalBetId,
          copiedBetId,
        }),
      });
    } catch (error) {
      console.error('Error tracking bet copy:', error);
    }
  }
}

// Badge system
export class BadgeSystem {
  private static readonly BADGE_DEFINITIONS: Record<string, Omit<Badge, 'earnedAt'>> = {
    first_bet: {
      id: 'first_bet',
      name: 'First Timer',
      description: 'Placed your first bet',
      icon: '🎯',
      rarity: 'common',
      category: 'milestone'
    },
    viral_master: {
      id: 'viral_master',
      name: 'Viral Master',
      description: 'Correctly predicted 50 viral posts',
      icon: '🚀',
      rarity: 'epic',
      category: 'achievement'
    },
    win_streak_5: {
      id: 'win_streak_5',
      name: 'Hot Streak',
      description: '5 wins in a row',
      icon: '🔥',
      rarity: 'rare',
      category: 'streak'
    },
    high_roller: {
      id: 'high_roller',
      name: 'High Roller',
      description: 'Placed a bet over $100',
      icon: '💎',
      rarity: 'epic',
      category: 'achievement'
    },
    social_butterfly: {
      id: 'social_butterfly',
      name: 'Social Butterfly',
      description: 'Followed by 100+ other bettors',
      icon: '🦋',
      rarity: 'rare',
      category: 'achievement'
    }
  };

  /**
   * Check if user earned any new badges
   */
  static checkNewBadges(userStats: any): Badge[] {
    const newBadges: Badge[] = [];
    
    // Check various conditions
    if (userStats.totalBets === 1 && !userStats.badges?.includes('first_bet')) {
      newBadges.push({
        ...this.BADGE_DEFINITIONS.first_bet,
        earnedAt: new Date()
      });
    }

    if (userStats.winStreak >= 5 && !userStats.badges?.includes('win_streak_5')) {
      newBadges.push({
        ...this.BADGE_DEFINITIONS.win_streak_5,
        earnedAt: new Date()
      });
    }

    // Add more badge checks...

    return newBadges;
  }

  /**
   * Calculate reputation score based on various factors
   */
  static calculateReputation(userStats: any, socialMetrics: SocialMetrics): number {
    let reputation = 50; // Base score

    // Win rate contribution (0-30 points)
    reputation += Math.min(30, userStats.winRate * 30);

    // Activity contribution (0-20 points)
    const activityScore = Math.min(20, (userStats.totalBets / 100) * 20);
    reputation += activityScore;

    // Social contribution (0-30 points)
    const socialScore = Math.min(30, 
      (socialMetrics.followers / 50) * 10 +
      (socialMetrics.influence / 100) * 10 +
      (socialMetrics.communityRating / 5) * 10
    );
    reputation += socialScore;

    // Penalty for very low win rate
    if (userStats.winRate < 0.3 && userStats.totalBets > 10) {
      reputation -= 20;
    }

    return Math.max(0, Math.min(100, Math.round(reputation)));
  }
}

// Chat service for live market discussions
export class MarketChatService {
  /**
   * Send a message to market chat
   */
  async sendMessage(
    marketId: string, 
    authorFid: number, 
    message: string, 
    type: ChatMessage['type'] = 'message'
  ): Promise<string | null> {
    try {
      const chatMessage: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        marketId,
        authorFid,
        username: 'user', // Would be fetched from user data
        displayName: 'User Display Name',
        message: message.slice(0, 500), // Limit message length
        timestamp: new Date(),
        type,
        reactions: [],
        isDeleted: false
      };

      // Save to database and broadcast to real-time subscribers
      console.log('New chat message:', chatMessage);
      return chatMessage.id;
    } catch (error) {
      console.error('Error sending message:', error);
      return null;
    }
  }

  /**
   * Get chat messages for a market
   */
  async getMarketChat(marketId: string, limit: number = 50): Promise<ChatMessage[]> {
    // Mock implementation - would query database
    return [];
  }

  /**
   * Add reaction to a message
   */
  async addReaction(messageId: string, fid: number, emoji: string): Promise<boolean> {
    try {
      // Add reaction to message
      console.log(`Added ${emoji} reaction to ${messageId} by ${fid}`);
      return true;
    } catch (error) {
      console.error('Error adding reaction:', error);
      return false;
    }
  }
}

// Export services
export const socialBettingService = new SocialBettingService();
export const marketChatService = new MarketChatService();

export default {
  SocialBettingService,
  BadgeSystem,
  MarketChatService,
  socialBettingService,
  marketChatService
};
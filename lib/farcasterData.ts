/**
 * Real-time Farcaster Data Integration
 * Connects to Neynar API for live creator and content metrics
 */

import { CreatorMetrics, CastMetrics, ChannelMetrics, RealTimeMetrics, DataProvider } from './marketTypes';
import { Cast, Channel, Creator, FarcasterUser } from './types';

// Neynar API configuration
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || '';
const NEYNAR_BASE_URL = 'https://api.neynar.com/v2';

interface NeynarUser {
  fid: number;
  username: string;
  display_name: string;
  pfp_url?: string;
  bio?: { text: string };
  follower_count: number;
  following_count: number;
  verifications: string[];
  active_status: 'active' | 'inactive';
}

interface NeynarCast {
  hash: string;
  thread_hash: string;
  parent_hash?: string;
  author: NeynarUser;
  text: string;
  timestamp: string;
  embeds: any[];
  reactions: {
    likes_count: number;
    recasts_count: number;
    replies_count: number;
  };
  replies?: { count: number };
}

interface NeynarChannel {
  id: string;
  name: string;
  description: string;
  image_url?: string;
  lead_fid?: number;
  moderator_fids?: number[];
  follower_count: number;
  member_count?: number;
}

// Real-time data provider implementation
export class FarcasterDataProvider implements DataProvider {
  private subscriptions = new Map<string, (metrics: RealTimeMetrics) => void>();
  private updateIntervals = new Map<string, NodeJS.Timeout>();
  
  constructor() {
    this.validateApiKey();
  }

  private validateApiKey() {
    if (!NEYNAR_API_KEY) {
      console.warn('⚠️  NEYNAR_API_KEY not found. Real-time data will use mock data.');
    }
  }

  /**
   * Get comprehensive creator metrics
   */
  async getCreatorMetrics(fid: number): Promise<CreatorMetrics | null> {
    try {
      if (!NEYNAR_API_KEY) {
        return this.getMockCreatorMetrics(fid);
      }

      const response = await fetch(`${NEYNAR_BASE_URL}/user/bulk?fids=${fid}`, {
        headers: {
          'accept': 'application/json',
          'api_key': NEYNAR_API_KEY
        }
      });

      if (!response.ok) {
        throw new Error(`Neynar API error: ${response.status}`);
      }

      const data = await response.json();
      const user = data.users?.[0] as NeynarUser;
      
      if (!user) return null;

      // Get user's recent casts for engagement calculation
      const castsResponse = await fetch(`${NEYNAR_BASE_URL}/casts?fid=${fid}&limit=25`, {
        headers: {
          'accept': 'application/json',
          'api_key': NEYNAR_API_KEY
        }
      });

      let avgEngagement = 0;
      let totalCasts = 0;
      
      if (castsResponse.ok) {
        const castsData = await castsResponse.json();
        const casts = castsData.casts || [];
        totalCasts = casts.length;
        
        if (casts.length > 0) {
          const totalEngagement = casts.reduce((sum: number, cast: NeynarCast) => {
            return sum + cast.reactions.likes_count + cast.reactions.recasts_count + cast.reactions.replies_count;
          }, 0);
          avgEngagement = totalEngagement / casts.length;
        }
      }

      return {
        fid: user.fid,
        username: user.username,
        displayName: user.display_name,
        followerCount: user.follower_count,
        followingCount: user.following_count,
        totalCasts,
        avgEngagement,
        growthRate: this.calculateGrowthRate(user.follower_count), // Simplified
        lastActiveDate: new Date(),
        verificationStatus: user.verifications.length > 0,
        profilePicture: user.pfp_url
      };
    } catch (error) {
      console.error('Error fetching creator metrics:', error);
      return this.getMockCreatorMetrics(fid);
    }
  }

  /**
   * Get detailed cast metrics
   */
  async getCastMetrics(hash: string): Promise<CastMetrics | null> {
    try {
      if (!NEYNAR_API_KEY) {
        return this.getMockCastMetrics(hash);
      }

      const response = await fetch(`${NEYNAR_BASE_URL}/cast?identifier=${hash}&type=hash`, {
        headers: {
          'accept': 'application/json',
          'api_key': NEYNAR_API_KEY
        }
      });

      if (!response.ok) {
        throw new Error(`Neynar API error: ${response.status}`);
      }

      const data = await response.json();
      const cast = data.cast as NeynarCast;
      
      if (!cast) return null;

      const totalEngagement = cast.reactions.likes_count + cast.reactions.recasts_count + cast.reactions.replies_count;
      const authorFollowers = cast.author.follower_count;
      const engagementRate = authorFollowers > 0 ? totalEngagement / authorFollowers : 0;

      return {
        hash: cast.hash,
        authorFid: cast.author.fid,
        text: cast.text,
        timestamp: new Date(cast.timestamp),
        likes: cast.reactions.likes_count,
        recasts: cast.reactions.recasts_count,
        replies: cast.reactions.replies_count,
        totalEngagement,
        engagementRate,
        isFrame: cast.embeds.some(embed => embed.cast?.embeds?.some((e: any) => e.metadata?.content_type?.includes('frame'))),
        frameInteractions: cast.embeds.length // Simplified
      };
    } catch (error) {
      console.error('Error fetching cast metrics:', error);
      return this.getMockCastMetrics(hash);
    }
  }

  /**
   * Get channel metrics
   */
  async getChannelMetrics(channelId: string): Promise<ChannelMetrics | null> {
    try {
      if (!NEYNAR_API_KEY) {
        return this.getMockChannelMetrics(channelId);
      }

      const response = await fetch(`${NEYNAR_BASE_URL}/channel?id=${channelId}`, {
        headers: {
          'accept': 'application/json',
          'api_key': NEYNAR_API_KEY
        }
      });

      if (!response.ok) {
        throw new Error(`Neynar API error: ${response.status}`);
      }

      const data = await response.json();
      const channel = data.channel as NeynarChannel;
      
      if (!channel) return null;

      return {
        id: channel.id,
        name: channel.name,
        description: channel.description,
        followerCount: channel.follower_count,
        memberCount: channel.member_count || 0,
        dailyActiveUsers: Math.floor(channel.follower_count * 0.1), // Estimate
        totalCasts: Math.floor(channel.follower_count * 2), // Estimate
        avgEngagement: Math.floor(channel.follower_count * 0.05), // Estimate
        growthRate: this.calculateGrowthRate(channel.follower_count),
        lastActivityDate: new Date(),
        leadFid: channel.lead_fid,
        imageUrl: channel.image_url
      };
    } catch (error) {
      console.error('Error fetching channel metrics:', error);
      return this.getMockChannelMetrics(channelId);
    }
  }

  /**
   * Get stream metrics (placeholder for future streaming integration)
   */
  async getStreamMetrics(streamId: string): Promise<any> {
    // Placeholder for future streaming platform integration
    return {
      streamId,
      creatorFid: 123,
      platform: 'farcaster',
      title: 'Live Stream',
      currentViewers: Math.floor(Math.random() * 100) + 10,
      peakViewers: Math.floor(Math.random() * 200) + 50,
      startTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
      isLive: Math.random() > 0.3,
      totalViewTime: Math.floor(Math.random() * 1000) + 100,
      avgViewDuration: Math.floor(Math.random() * 30) + 5
    };
  }

  /**
   * Subscribe to real-time updates for a target
   */
  subscribeToUpdates(targetId: string, callback: (metrics: RealTimeMetrics) => void): void {
    this.subscriptions.set(targetId, callback);

    // Start polling for updates
    const interval = setInterval(async () => {
      try {
        const metrics = await this.getRealTimeMetrics(targetId);
        if (metrics) {
          callback(metrics);
        }
      } catch (error) {
        console.error(`Error updating metrics for ${targetId}:`, error);
      }
    }, 30000); // Update every 30 seconds

    this.updateIntervals.set(targetId, interval);
    
    console.log(`📡 Subscribed to real-time updates for ${targetId}`);
  }

  /**
   * Unsubscribe from updates
   */
  unsubscribeFromUpdates(targetId: string): void {
    this.subscriptions.delete(targetId);
    
    const interval = this.updateIntervals.get(targetId);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(targetId);
    }
    
    console.log(`📡 Unsubscribed from updates for ${targetId}`);
  }

  /**
   * Get real-time metrics for any target (cast, user, channel)
   */
  private async getRealTimeMetrics(targetId: string): Promise<RealTimeMetrics | null> {
    try {
      // Determine target type based on ID format
      let type: any;
      let currentValue = 0;
      
      if (targetId.startsWith('0x')) {
        // Cast hash
        type = 0; // VIRAL_CAST
        const castMetrics = await this.getCastMetrics(targetId);
        currentValue = castMetrics?.totalEngagement || 0;
      } else if (/^\d+$/.test(targetId)) {
        // FID (user)
        type = 4; // FOLLOWER_GROWTH
        const userMetrics = await this.getCreatorMetrics(parseInt(targetId));
        currentValue = userMetrics?.followerCount || 0;
      } else {
        // Channel ID
        type = 2; // CHANNEL_GROWTH
        const channelMetrics = await this.getChannelMetrics(targetId);
        currentValue = channelMetrics?.followerCount || 0;
      }

      // Get historical value (simplified - would need database)
      const startValue = Math.floor(currentValue * 0.9); // Mock 10% growth
      const targetValue = Math.floor(currentValue * 1.2); // Mock target
      
      const changeRate = (currentValue - startValue) / 1; // Per hour (simplified)
      const timeRemaining = 24; // Mock 24 hours remaining
      
      // Calculate likelihood
      const needed = targetValue - currentValue;
      const projected = changeRate * timeRemaining;
      const likelihood = Math.min(1, Math.max(0, projected / needed));

      return {
        targetId,
        type,
        currentValue,
        startValue,
        targetValue,
        lastUpdated: new Date(),
        changeRate,
        timeRemaining,
        likelihood
      };
    } catch (error) {
      console.error('Error getting real-time metrics:', error);
      return null;
    }
  }

  /**
   * Batch fetch multiple users for leaderboards
   */
  async batchGetUsers(fids: number[]): Promise<CreatorMetrics[]> {
    try {
      if (!NEYNAR_API_KEY || fids.length === 0) {
        return fids.map(fid => this.getMockCreatorMetrics(fid)).filter(Boolean) as CreatorMetrics[];
      }

      const fidString = fids.slice(0, 100).join(','); // Neynar limit
      const response = await fetch(`${NEYNAR_BASE_URL}/user/bulk?fids=${fidString}`, {
        headers: {
          'accept': 'application/json',
          'api_key': NEYNAR_API_KEY
        }
      });

      if (!response.ok) {
        throw new Error(`Neynar API error: ${response.status}`);
      }

      const data = await response.json();
      const users = data.users as NeynarUser[];

      return await Promise.all(users.map(async (user) => {
        return {
          fid: user.fid,
          username: user.username,
          displayName: user.display_name,
          followerCount: user.follower_count,
          followingCount: user.following_count,
          totalCasts: Math.floor(user.follower_count * 0.5), // Estimate
          avgEngagement: Math.floor(user.follower_count * 0.02), // Estimate
          growthRate: this.calculateGrowthRate(user.follower_count),
          lastActiveDate: new Date(),
          verificationStatus: user.verifications.length > 0,
          profilePicture: user.pfp_url
        };
      }));
    } catch (error) {
      console.error('Error batch fetching users:', error);
      return [];
    }
  }

  /**
   * Search for trending casts
   */
  async getTrendingCasts(limit: number = 25): Promise<CastMetrics[]> {
    try {
      if (!NEYNAR_API_KEY) {
        return Array(limit).fill(null).map((_, i) => this.getMockCastMetrics(`0x${i.toString().padStart(40, '0')}`)).filter(Boolean) as CastMetrics[];
      }

      const response = await fetch(`${NEYNAR_BASE_URL}/casts?limit=${limit}`, {
        headers: {
          'accept': 'application/json',
          'api_key': NEYNAR_API_KEY
        }
      });

      if (!response.ok) {
        throw new Error(`Neynar API error: ${response.status}`);
      }

      const data = await response.json();
      const casts = data.casts as NeynarCast[];

      return casts.map(cast => ({
        hash: cast.hash,
        authorFid: cast.author.fid,
        text: cast.text,
        timestamp: new Date(cast.timestamp),
        likes: cast.reactions.likes_count,
        recasts: cast.reactions.recasts_count,
        replies: cast.reactions.replies_count,
        totalEngagement: cast.reactions.likes_count + cast.reactions.recasts_count + cast.reactions.replies_count,
        engagementRate: cast.reactions.likes_count / Math.max(cast.author.follower_count, 1),
        isFrame: cast.embeds.some(embed => embed.metadata?.content_type?.includes('frame')),
        frameInteractions: cast.embeds.length
      }));
    } catch (error) {
      console.error('Error fetching trending casts:', error);
      return [];
    }
  }

  // Helper methods
  private calculateGrowthRate(currentFollowers: number): number {
    // Simplified growth rate calculation
    // In production, this would use historical data
    const baseGrowth = Math.log(Math.max(currentFollowers, 1)) / 10;
    return Math.max(0, baseGrowth + (Math.random() - 0.5) * 0.1);
  }

  // Mock data methods for when API is unavailable
  private getMockCreatorMetrics(fid: number): CreatorMetrics {
    return {
      fid,
      username: `user${fid}`,
      displayName: `User ${fid}`,
      followerCount: Math.floor(Math.random() * 10000) + 100,
      followingCount: Math.floor(Math.random() * 1000) + 50,
      totalCasts: Math.floor(Math.random() * 500) + 20,
      avgEngagement: Math.floor(Math.random() * 50) + 5,
      growthRate: Math.random() * 0.1,
      lastActiveDate: new Date(),
      verificationStatus: Math.random() > 0.7,
      profilePicture: `https://example.com/avatar${fid}.jpg`
    };
  }

  private getMockCastMetrics(hash: string): CastMetrics {
    const likes = Math.floor(Math.random() * 100) + 5;
    const recasts = Math.floor(Math.random() * 30) + 2;
    const replies = Math.floor(Math.random() * 20) + 1;

    return {
      hash,
      authorFid: Math.floor(Math.random() * 1000) + 100,
      text: 'Mock cast content for testing',
      timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
      likes,
      recasts,
      replies,
      totalEngagement: likes + recasts + replies,
      engagementRate: Math.random() * 0.1,
      isFrame: Math.random() > 0.8,
      frameInteractions: Math.floor(Math.random() * 10)
    };
  }

  private getMockChannelMetrics(channelId: string): ChannelMetrics {
    const followers = Math.floor(Math.random() * 5000) + 100;
    return {
      id: channelId,
      name: channelId.charAt(0).toUpperCase() + channelId.slice(1),
      description: `Mock channel description for ${channelId}`,
      followerCount: followers,
      memberCount: Math.floor(followers * 0.8),
      dailyActiveUsers: Math.floor(followers * 0.1),
      totalCasts: Math.floor(followers * 2),
      avgEngagement: Math.floor(followers * 0.05),
      growthRate: Math.random() * 0.05,
      lastActivityDate: new Date(),
      imageUrl: `https://example.com/channel_${channelId}.jpg`
    };
  }
}

// Export singleton instance
export const farcasterDataProvider = new FarcasterDataProvider();

// Utility functions for data transformation
export function convertToFarcasterUser(neynarUser: NeynarUser): FarcasterUser {
  return {
    fid: neynarUser.fid,
    username: neynarUser.username,
    displayName: neynarUser.display_name,
    pfpUrl: neynarUser.pfp_url,
    bio: neynarUser.bio?.text,
    followerCount: neynarUser.follower_count,
    followingCount: neynarUser.following_count,
    verifications: neynarUser.verifications,
    activeStatus: neynarUser.active_status
  };
}

export function convertToChannel(neynarChannel: NeynarChannel): Channel {
  return {
    id: neynarChannel.id,
    name: neynarChannel.name,
    description: neynarChannel.description,
    followers: neynarChannel.follower_count,
    growth: Math.random() * 10, // Mock growth percentage
    avatarInitials: neynarChannel.name.slice(0, 2).toUpperCase(),
    imageUrl: neynarChannel.image_url,
    leadFid: neynarChannel.lead_fid,
    moderatorFids: neynarChannel.moderator_fids,
    memberCount: neynarChannel.member_count
  };
}

export default {
  FarcasterDataProvider,
  farcasterDataProvider,
  convertToFarcasterUser,
  convertToChannel
};
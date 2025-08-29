/**
 * Real-time Farcaster Data Integration
 * Connects to Neynar API for live creator and content metrics
 */

import { CreatorMetrics, CastMetrics, ChannelMetrics, RealTimeMetrics, DataProvider } from './marketTypes';
import { Channel, FarcasterUser } from './types';

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

export class FarcasterDataProvider implements DataProvider {
  private subscriptions = new Map<string, (metrics: RealTimeMetrics) => void>();
  private updateIntervals = new Map<string, NodeJS.Timeout>();

  private ensureKey() {
    if (!NEYNAR_API_KEY) {
      throw new Error('NEYNAR_API_KEY not configured');
    }
  }

  async getCreatorMetrics(fid: number): Promise<CreatorMetrics | null> {
    this.ensureKey();
    const response = await fetch(`${NEYNAR_BASE_URL}/user/bulk?fids=${fid}`, {
      headers: { accept: 'application/json', api_key: NEYNAR_API_KEY },
    });
    if (!response.ok) {
      throw new Error(`Neynar API error: ${response.status}`);
    }

    const data = await response.json();
    const user = data.users?.[0] as NeynarUser;
    if (!user) return null;

    const castsResponse = await fetch(`${NEYNAR_BASE_URL}/casts?fid=${fid}&limit=25`, {
      headers: { accept: 'application/json', api_key: NEYNAR_API_KEY },
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
      growthRate: 0,
      lastActiveDate: new Date(),
      verificationStatus: user.verifications.length > 0,
      profilePicture: user.pfp_url,
    };
  }

  async getCastMetrics(hash: string): Promise<CastMetrics | null> {
    this.ensureKey();
    const response = await fetch(`${NEYNAR_BASE_URL}/cast?identifier=${hash}&type=hash`, {
      headers: { accept: 'application/json', api_key: NEYNAR_API_KEY },
    });
    if (!response.ok) {
      throw new Error(`Neynar API error: ${response.status}`);
    }

    const data = await response.json();
    const cast = data.cast as NeynarCast;
    if (!cast) return null;

    const totalEngagement =
      cast.reactions.likes_count + cast.reactions.recasts_count + cast.reactions.replies_count;
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
      isFrame: cast.embeds.some((embed) =>
        embed.cast?.embeds?.some((e: any) => e.metadata?.content_type?.includes('frame'))
      ),
      frameInteractions: cast.embeds.length,
    };
  }

  async getChannelMetrics(channelId: string): Promise<ChannelMetrics | null> {
    this.ensureKey();
    const response = await fetch(`${NEYNAR_BASE_URL}/channel?id=${channelId}`, {
      headers: { accept: 'application/json', api_key: NEYNAR_API_KEY },
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
      dailyActiveUsers: 0,
      totalCasts: 0,
      avgEngagement: 0,
      growthRate: 0,
      lastActivityDate: new Date(),
      leadFid: channel.lead_fid,
      imageUrl: channel.image_url,
    };
  }

  async getStreamMetrics(streamId: string): Promise<any> {
    return null;
  }

  subscribeToUpdates(targetId: string, callback: (metrics: RealTimeMetrics) => void): void {
    this.subscriptions.set(targetId, callback);

    const interval = setInterval(async () => {
      try {
        const metrics = await this.getRealTimeMetrics(targetId);
        if (metrics) callback(metrics);
      } catch (error) {
        console.error(`Error updating metrics for ${targetId}:`, error);
      }
    }, 30000);

    this.updateIntervals.set(targetId, interval);
  }

  unsubscribeFromUpdates(targetId: string): void {
    this.subscriptions.delete(targetId);

    const interval = this.updateIntervals.get(targetId);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(targetId);
    }
  }

  private async getRealTimeMetrics(targetId: string): Promise<RealTimeMetrics | null> {
    try {
      let type: any;
      let currentValue = 0;

      if (targetId.startsWith('0x')) {
        type = 0; // VIRAL_CAST
        const castMetrics = await this.getCastMetrics(targetId);
        currentValue = castMetrics?.totalEngagement || 0;
      } else if (/^\d+$/.test(targetId)) {
        type = 4; // FOLLOWER_GROWTH
        const userMetrics = await this.getCreatorMetrics(parseInt(targetId));
        currentValue = userMetrics?.followerCount || 0;
      } else {
        type = 2; // CHANNEL_GROWTH
        const channelMetrics = await this.getChannelMetrics(targetId);
        currentValue = channelMetrics?.followerCount || 0;
      }

      const startValue = currentValue;
      const targetValue = currentValue;

      const changeRate = 0;
      const timeRemaining = 0;

      return {
        targetId,
        type,
        currentValue,
        startValue,
        targetValue,
        lastUpdated: new Date(),
        changeRate,
        timeRemaining,
        likelihood: 0,
      };
    } catch (error) {
      console.error('Error getting real-time metrics:', error);
      return null;
    }
  }

  async batchGetUsers(fids: number[]): Promise<CreatorMetrics[]> {
    this.ensureKey();
    if (fids.length === 0) return [];

    const fidString = fids.slice(0, 100).join(',');
    const response = await fetch(`${NEYNAR_BASE_URL}/user/bulk?fids=${fidString}`, {
      headers: { accept: 'application/json', api_key: NEYNAR_API_KEY },
    });

    if (!response.ok) {
      throw new Error(`Neynar API error: ${response.status}`);
    }

    const data = await response.json();
    const users = data.users as NeynarUser[];

    return await Promise.all(
      users.map(async (user) => {
        return {
          fid: user.fid,
          username: user.username,
          displayName: user.display_name,
          followerCount: user.follower_count,
          followingCount: user.following_count,
          totalCasts: 0,
          avgEngagement: 0,
          growthRate: 0,
          lastActiveDate: new Date(),
          verificationStatus: user.verifications.length > 0,
          profilePicture: user.pfp_url,
        };
      })
    );
  }

  async getTrendingCasts(limit: number = 25): Promise<CastMetrics[]> {
    this.ensureKey();
    const response = await fetch(`${NEYNAR_BASE_URL}/casts?limit=${limit}`, {
      headers: { accept: 'application/json', api_key: NEYNAR_API_KEY },
    });

    if (!response.ok) {
      throw new Error(`Neynar API error: ${response.status}`);
    }

    const data = await response.json();
    const casts = data.casts as NeynarCast[];

    return casts.map((cast) => ({
      hash: cast.hash,
      authorFid: cast.author.fid,
      text: cast.text,
      timestamp: new Date(cast.timestamp),
      likes: cast.reactions.likes_count,
      recasts: cast.reactions.recasts_count,
      replies: cast.reactions.replies_count,
      totalEngagement: cast.reactions.likes_count + cast.reactions.recasts_count + cast.reactions.replies_count,
      engagementRate: cast.reactions.likes_count / Math.max(cast.author.follower_count, 1),
      isFrame: cast.embeds.some((embed) => embed.metadata?.content_type?.includes('frame')),
      frameInteractions: cast.embeds.length,
    }));
  }
}

export const farcasterDataProvider = new FarcasterDataProvider();

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
    activeStatus: neynarUser.active_status,
  };
}

export function convertToChannel(neynarChannel: NeynarChannel): Channel {
  return {
    id: neynarChannel.id,
    name: neynarChannel.name,
    description: neynarChannel.description,
    followers: neynarChannel.follower_count,
    growth: 0,
    avatarInitials: neynarChannel.name.slice(0, 2).toUpperCase(),
    imageUrl: neynarChannel.image_url,
    leadFid: neynarChannel.lead_fid,
    moderatorFids: neynarChannel.moderator_fids,
    memberCount: neynarChannel.member_count,
  };
}

export default {
  FarcasterDataProvider,
  farcasterDataProvider,
  convertToFarcasterUser,
  convertToChannel,
};
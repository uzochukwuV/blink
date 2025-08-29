import { NeynarAPIClient, Configuration, WebhookUserCreated } from '@neynar/nodejs-sdk';
import { APP_URL } from './constants';
import { Creator, Channel, FarcasterUser, Cast } from './types';

let neynarClient: NeynarAPIClient | null = null;

// Example usage:
// const client = getNeynarClient();
// const user = await client.lookupUserByFid(fid); 
export function getNeynarClient() {
  if (!neynarClient) {
    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) {
      throw new Error('NEYNAR_API_KEY not configured');
    }
    const config = new Configuration({ apiKey });
    neynarClient = new NeynarAPIClient(config);
  }
  return neynarClient;
}

type User = WebhookUserCreated['data'];

export async function getNeynarUser(fid: number): Promise<User | null> {
  try {
    const client = getNeynarClient();
    const usersResponse = await client.fetchBulkUsers({ fids: [fid] });
    return usersResponse.users[0];
  } catch (error) {
    console.error('Error getting Neynar user:', error);
    return null;
  }
}

type SendMiniAppNotificationResult =
  | {
      state: "error";
      error: unknown;
    }
  | { state: "no_token" }
  | { state: "rate_limit" }
  | { state: "success" };

export async function sendNeynarMiniAppNotification({
  fid,
  title,
  body,
}: {
  fid: number;
  title: string;
  body: string;
}): Promise<SendMiniAppNotificationResult> {
  try {
    const client = getNeynarClient();
    const targetFids = [fid];
    const notification = {
      title,
      body,
      target_url: APP_URL,
    };

    const result = await client.publishFrameNotifications({ 
      targetFids, 
      notification 
    });

    if (result.notification_deliveries.length > 0) {
      return { state: "success" };
    } else if (result.notification_deliveries.length === 0) {
      return { state: "no_token" };
    } else {
      return { state: "error", error: result || "Unknown error" };
    }
  } catch (error) {
    return { state: "error", error };
  }
}

/**
 * Fetch popular Farcaster creators/users
 */
export async function getPopularCreators(limit: number = 20): Promise<Creator[]> {
  try {
    const client = getNeynarClient();
    // Use power users as a proxy for popular creators (SDK v2)
    const response = await client.fetchPowerUsers({ limit });
    return response.users.map((user: any) => {
      // Some SDK responses nest user under `user`
      const u = (user.user ?? user) as any;
      return {
        id: String(u.fid),
        name: u.displayName || u.username,
        username: u.username,
        fid: u.fid,
        followers: u.followerCount || 0,
        avatarInitials: (u.displayName || u.username)?.charAt(0)?.toUpperCase?.() || "?",
        avatarUrl: u.pfp?.url,
        pfpUrl: u.pfp?.url,
        bio: u.profile?.bio?.text,
        verified: Array.isArray(u.verifications) && u.verifications.length > 0,
      } as Creator;
    });
  } catch (error) {
    console.error('Error fetching popular creators:', error);
    return [];
  }
}

/**
 * Search for Farcaster users/creators
 */
export async function searchCreators(query: string, limit: number = 20): Promise<Creator[]> {
  try {
    const client = getNeynarClient();
    
    const response = await client.searchUser({ q: query, limit });
    
    return response.result.users.map((user) => ({
      id: user.fid.toString(),
      name: user.displayName || user.username,
      username: user.username,
      fid: user.fid,
      followers: user.followerCount || 0,
      avatarInitials: (user.displayName || user.username).charAt(0).toUpperCase(),
      avatarUrl: user.pfp?.url,
      pfpUrl: user.pfp?.url,
      bio: user.profile?.bio?.text,
      verified: user.verifications && user.verifications.length > 0,
    }));
  } catch (error) {
    console.error('Error searching creators:', error);
    return [];
  }
}

/**
 * Fetch popular Farcaster channels
 */
export async function getPopularChannels(limit: number = 20): Promise<Channel[]> {
  try {
    const client = getNeynarClient();
    // Use trending channels (SDK v2)
    const response = await client.fetchTrendingChannels({ limit });
    return response.channels.map((activity: any) => {
      const ch = activity.channel;
      return {
        id: ch.id,
        name: ch.name,
        description: ch.description,
        followers: ch.followerCount || 0,
        growth: 0, // real growth requires historical data; set 0
        avatarInitials: ch.name?.charAt(0)?.toUpperCase?.() || "?",
        imageUrl: ch.imageUrl,
        url: ch.url,
        leadFid: ch.lead?.fid,
        moderatorFids: ch.moderators?.map((m: any) => m.fid) || [],
        memberCount: ch.followerCount || 0,
      } as Channel;
    });
  } catch (error) {
    console.error('Error fetching popular channels:', error);
    return [];
  }
}

/**
 * Search for Farcaster channels
 */
export async function searchChannels(query: string, limit: number = 20): Promise<Channel[]> {
  try {
    const client = getNeynarClient();
    
    const response = await client.searchChannels({ q: query, limit });
    
    return response.channels.map((channel) => ({
      id: channel.id,
      name: channel.name,
      description: channel.description,
      followers: channel.followerCount || 0,
      growth: Math.floor(Math.random() * 30) + 5, // Mock growth for now
      avatarInitials: channel.name.charAt(0).toUpperCase(),
      imageUrl: channel.imageUrl,
      url: channel.url,
      leadFid: channel.lead?.fid,
      moderatorFids: channel.moderators?.map(m => m.fid) || [],
      memberCount: channel.followerCount || 0,
    }));
  } catch (error) {
    console.error('Error searching channels:', error);
    return [];
  }
}

/**
 * Get a specific user by FID
 */
export async function getFarcasterUser(fid: number): Promise<FarcasterUser | null> {
  try {
    const client = getNeynarClient();
    const response = await client.fetchBulkUsers({ fids: [fid] });
    const user = response.users[0];
    
    if (!user) return null;
    
    return {
      fid: user.fid,
      username: user.username,
      displayName: user.displayName || user.username,
      pfpUrl: user.pfp?.url,
      bio: user.profile?.bio?.text,
      followerCount: user.followerCount || 0,
      followingCount: user.followingCount || 0,
      verifications: user.verifications || [],
      activeStatus: user.activeStatus as "active" | "inactive",
    };
  } catch (error) {
    console.error('Error fetching Farcaster user:', error);
    return null;
  }
}

/**
 * Get trending casts
 */
export async function getTrendingCasts(limit: number = 10): Promise<Cast[]> {
  try {
    const client = getNeynarClient();
    
    // Get trending casts from the global feed
    const response = await client.fetchFeed({ 
      feedType: 'following', // or 'global'
      fid: 1, // Use a default FID for global feed
      limit 
    });
    
    return response.casts.map((cast) => ({
      hash: cast.hash,
      threadHash: cast.threadHash,
      parentHash: cast.parentHash,
      authorFid: cast.author.fid,
      author: {
        fid: cast.author.fid,
        username: cast.author.username,
        displayName: cast.author.displayName || cast.author.username,
        pfpUrl: cast.author.pfp?.url,
        followerCount: cast.author.followerCount || 0,
        followingCount: cast.author.followingCount || 0,
      },
      text: cast.text,
      timestamp: cast.timestamp,
      embeds: cast.embeds,
      reactions: {
        likesCount: cast.reactions?.likesCount || 0,
        recastsCount: cast.reactions?.recastsCount || 0,
        repliesCount: cast.replies?.count || 0,
      },
      replies: {
        count: cast.replies?.count || 0,
      },
    }));
  } catch (error) {
    console.error('Error fetching trending casts:', error);
    return [];
  }
} 
export type Bet = {
  id: string;
  marketId: string;
  marketTitle?: string;
  userId: string;
  amount: number;
  side: "yes" | "no";
  status: "open" | "completed";
  result?: "won" | "lost";
  payout?: number;
  createdAt: string;
  notes?: string;
};

export type Creator = {
  id: string;
  name: string;
  username?: string;
  fid?: number;
  followers: number;
  avatarInitials: string;
  avatarUrl?: string;
  pfpUrl?: string;
  bio?: string;
  verified?: boolean;
};

export type Channel = {
  id: string;
  name: string;
  description?: string;
  followers: number;
  growth: number;
  avatarInitials: string;
  imageUrl?: string;
  url?: string;
  leadFid?: number;
  moderatorFids?: number[];
  memberCount?: number;
};

export type Cast = {
  hash: string;
  threadHash: string;
  parentHash?: string;
  authorFid: number;
  author: {
    fid: number;
    username: string;
    displayName: string;
    pfpUrl?: string;
    followerCount: number;
    followingCount: number;
  };
  text: string;
  timestamp: string;
  embeds?: any[];
  reactions: {
    likesCount: number;
    recastsCount: number;
    repliesCount: number;
  };
  replies?: {
    count: number;
  };
};

export type FarcasterUser = {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl?: string;
  bio?: string;
  followerCount: number;
  followingCount: number;
  verifications?: string[];
  activeStatus: "active" | "inactive";
};
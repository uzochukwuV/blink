/**
 * Enhanced Market Types and Real-time Data Integration
 * Core betting features with live data tracking
 */

import { Cast, Channel, Creator } from './types';

// Enhanced prediction types with real-time data
export enum PredictionType {
  VIRAL_CAST = 0,           // Will this cast get X likes/recasts?
  POLL_OUTCOME = 1,         // Farcaster poll result prediction  
  CHANNEL_GROWTH = 2,       // Channel follower/engagement growth
  CREATOR_MILESTONE = 3,    // Creator hitting specific metrics
  FOLLOWER_GROWTH = 4,      // Real-time follower growth bets
  LIVE_STREAM_VIEWS = 5,    // Live streaming viewership bets
  ENGAGEMENT_BATTLE = 6,    // Head-to-head creator engagement
  TRENDING_CAST = 7,        // Will cast trend in next X hours
  FRAME_INTERACTIONS = 8    // Farcaster Frame interaction thresholds
}

export interface MarketTemplate {
  type: PredictionType;
  title: string;
  description: string;
  suggestedThresholds: number[];
  minDuration: number; // hours
  maxDuration: number; // hours
  icon: string;
  category: 'growth' | 'content' | 'engagement' | 'milestone';
}

export const MARKET_TEMPLATES: Record<PredictionType, MarketTemplate> = {
  [PredictionType.VIRAL_CAST]: {
    type: PredictionType.VIRAL_CAST,
    title: "Viral Cast Prediction",
    description: "Will this cast reach the target engagement?",
    suggestedThresholds: [100, 500, 1000, 2500, 5000],
    minDuration: 1,
    maxDuration: 72,
    icon: "🚀",
    category: 'content'
  },
  [PredictionType.FOLLOWER_GROWTH]: {
    type: PredictionType.FOLLOWER_GROWTH,
    title: "Follower Growth Challenge",
    description: "Will this creator gain X followers?",
    suggestedThresholds: [50, 100, 250, 500, 1000],
    minDuration: 24,
    maxDuration: 168,
    icon: "📈",
    category: 'growth'
  },
  [PredictionType.CHANNEL_GROWTH]: {
    type: PredictionType.CHANNEL_GROWTH,
    title: "Channel Growth Battle",
    description: "Which channel will grow faster?",
    suggestedThresholds: [10, 25, 50, 100, 250],
    minDuration: 24,
    maxDuration: 168,
    icon: "🏆",
    category: 'growth'
  },
  [PredictionType.CREATOR_MILESTONE]: {
    type: PredictionType.CREATOR_MILESTONE,
    title: "Creator Milestone",
    description: "Will creator reach this milestone?",
    suggestedThresholds: [1000, 5000, 10000, 25000, 50000],
    minDuration: 48,
    maxDuration: 720,
    icon: "🎯",
    category: 'milestone'
  },
  [PredictionType.LIVE_STREAM_VIEWS]: {
    type: PredictionType.LIVE_STREAM_VIEWS,
    title: "Live Stream Viewership",
    description: "Will this stream get X concurrent viewers?",
    suggestedThresholds: [50, 100, 250, 500, 1000],
    minDuration: 0.5,
    maxDuration: 12,
    icon: "📺",
    category: 'engagement'
  },
  [PredictionType.ENGAGEMENT_BATTLE]: {
    type: PredictionType.ENGAGEMENT_BATTLE,
    title: "Creator Engagement Battle",
    description: "Who will get more engagement?",
    suggestedThresholds: [100, 250, 500, 1000, 2500],
    minDuration: 6,
    maxDuration: 72,
    icon: "⚔️",
    category: 'engagement'
  },
  [PredictionType.TRENDING_CAST]: {
    type: PredictionType.TRENDING_CAST,
    title: "Trending Cast Prediction",
    description: "Will this cast trend today?",
    suggestedThresholds: [10, 25, 50, 100, 250],
    minDuration: 1,
    maxDuration: 24,
    icon: "🔥",
    category: 'content'
  },
  [PredictionType.POLL_OUTCOME]: {
    type: PredictionType.POLL_OUTCOME,
    title: "Poll Result Prediction",
    description: "What will this poll result be?",
    suggestedThresholds: [50, 60, 70, 80, 90],
    minDuration: 1,
    maxDuration: 168,
    icon: "📊",
    category: 'content'
  },
  [PredictionType.FRAME_INTERACTIONS]: {
    type: PredictionType.FRAME_INTERACTIONS,
    title: "Frame Interaction Bet",
    description: "How many will interact with this Frame?",
    suggestedThresholds: [25, 50, 100, 250, 500],
    minDuration: 1,
    maxDuration: 72,
    icon: "🖼️",
    category: 'engagement'
  }
};

// Real-time data tracking interfaces
export interface RealTimeMetrics {
  targetId: string;
  type: PredictionType;
  currentValue: number;
  startValue: number;
  targetValue: number;
  lastUpdated: Date;
  changeRate: number; // per hour
  timeRemaining: number; // hours
  likelihood: number; // 0-1 probability
}

export interface CreatorMetrics {
  fid: number;
  username: string;
  displayName: string;
  followerCount: number;
  followingCount: number;
  totalCasts: number;
  avgEngagement: number;
  growthRate: number;
  lastActiveDate: Date;
  verificationStatus: boolean;
  profilePicture?: string;
}

export interface CastMetrics {
  hash: string;
  authorFid: number;
  text: string;
  timestamp: Date;
  likes: number;
  recasts: number;
  replies: number;
  totalEngagement: number;
  engagementRate: number;
  isFrame: boolean;
  frameInteractions?: number;
}

export interface ChannelMetrics {
  id: string;
  name: string;
  description: string;
  followerCount: number;
  memberCount: number;
  dailyActiveUsers: number;
  totalCasts: number;
  avgEngagement: number;
  growthRate: number;
  lastActivityDate: Date;
  leadFid?: number;
  imageUrl?: string;
}

// Live streaming data (for future integration with streaming platforms)
export interface StreamMetrics {
  streamId: string;
  creatorFid: number;
  platform: 'farcaster' | 'twitch' | 'youtube' | 'other';
  title: string;
  currentViewers: number;
  peakViewers: number;
  startTime: Date;
  isLive: boolean;
  totalViewTime: number;
  avgViewDuration: number;
}

// Market creation helpers
export interface MarketCreationData {
  type: PredictionType;
  title: string;
  description?: string;
  targetId: string; // FID, cast hash, channel ID, stream ID
  threshold: number;
  duration: number; // hours
  creatorStake: number; // USDC amount
  category: string;
  tags?: string[];
}

// Real-time data provider interface
export interface DataProvider {
  getCreatorMetrics(fid: number): Promise<CreatorMetrics | null>;
  getCastMetrics(hash: string): Promise<CastMetrics | null>;
  getChannelMetrics(channelId: string): Promise<ChannelMetrics | null>;
  getStreamMetrics(streamId: string): Promise<StreamMetrics | null>;
  subscribeToUpdates(targetId: string, callback: (metrics: RealTimeMetrics) => void): void;
  unsubscribeFromUpdates(targetId: string): void;
}

// Market outcome calculation
export class OutcomeCalculator {
  /**
   * Calculate if a market outcome has been reached
   */
  static checkOutcome(
    type: PredictionType, 
    currentMetrics: RealTimeMetrics, 
    threshold: number
  ): boolean | null {
    if (!currentMetrics || currentMetrics.lastUpdated < new Date(Date.now() - 5 * 60 * 1000)) {
      return null; // Stale data, can't determine outcome
    }

    switch (type) {
      case PredictionType.VIRAL_CAST:
      case PredictionType.FRAME_INTERACTIONS:
        return currentMetrics.currentValue >= threshold;
        
      case PredictionType.FOLLOWER_GROWTH:
      case PredictionType.CREATOR_MILESTONE:
        return currentMetrics.currentValue >= threshold;
        
      case PredictionType.CHANNEL_GROWTH:
        const growth = currentMetrics.currentValue - currentMetrics.startValue;
        return growth >= threshold;
        
      case PredictionType.LIVE_STREAM_VIEWS:
        return currentMetrics.currentValue >= threshold;
        
      case PredictionType.TRENDING_CAST:
        // Trending is based on engagement rate + recency
        return currentMetrics.currentValue >= threshold;
        
      default:
        return null;
    }
  }

  /**
   * Calculate likelihood of reaching threshold based on current metrics
   */
  static calculateLikelihood(
    metrics: RealTimeMetrics,
    threshold: number,
    timeRemaining: number
  ): number {
    if (timeRemaining <= 0) return 0;
    if (metrics.currentValue >= threshold) return 1;

    const neededGrowth = threshold - metrics.currentValue;
    const projectedGrowth = metrics.changeRate * timeRemaining;
    
    // Simple linear projection with some randomness factor
    const likelihood = Math.min(1, projectedGrowth / neededGrowth);
    
    // Add confidence interval based on historical volatility
    const confidence = Math.max(0.1, Math.min(0.9, likelihood));
    
    return confidence;
  }

  /**
   * Suggest optimal thresholds based on current metrics
   */
  static suggestThresholds(
    type: PredictionType,
    currentValue: number,
    changeRate: number,
    duration: number
  ): number[] {
    const projectedGrowth = changeRate * duration;
    const baseThreshold = Math.max(1, currentValue + projectedGrowth * 0.5);
    
    return [
      Math.round(baseThreshold * 0.7),  // Easy (70% likely)
      Math.round(baseThreshold * 1.0),  // Medium (50% likely)  
      Math.round(baseThreshold * 1.4),  // Hard (30% likely)
      Math.round(baseThreshold * 2.0),  // Very Hard (15% likely)
      Math.round(baseThreshold * 3.0)   // Extreme (5% likely)
    ];
  }
}

// Market validation
export class MarketValidator {
  /**
   * Validate market creation parameters
   */
  static validateMarket(data: MarketCreationData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const template = MARKET_TEMPLATES[data.type];

    if (!template) {
      errors.push('Invalid market type');
      return { valid: false, errors };
    }

    // Validate duration
    if (data.duration < template.minDuration) {
      errors.push(`Duration must be at least ${template.minDuration} hours`);
    }
    
    if (data.duration > template.maxDuration) {
      errors.push(`Duration cannot exceed ${template.maxDuration} hours`);
    }

    // Validate threshold
    if (data.threshold <= 0) {
      errors.push('Threshold must be positive');
    }

    // Validate title
    if (!data.title || data.title.length < 10) {
      errors.push('Title must be at least 10 characters');
    }

    if (data.title.length > 200) {
      errors.push('Title cannot exceed 200 characters');
    }

    // Validate target ID format based on type
    if (!this.validateTargetId(data.type, data.targetId)) {
      errors.push('Invalid target ID format');
    }

    return { valid: errors.length === 0, errors };
  }

  private static validateTargetId(type: PredictionType, targetId: string): boolean {
    switch (type) {
      case PredictionType.VIRAL_CAST:
      case PredictionType.TRENDING_CAST:
      case PredictionType.FRAME_INTERACTIONS:
        // Cast hash format
        return /^0x[a-fA-F0-9]{40}$/.test(targetId);
        
      case PredictionType.FOLLOWER_GROWTH:
      case PredictionType.CREATOR_MILESTONE:
        // FID format
        return /^\d+$/.test(targetId) && parseInt(targetId) > 0;
        
      case PredictionType.CHANNEL_GROWTH:
        // Channel name format
        return /^[a-z0-9-]{1,50}$/.test(targetId);
        
      case PredictionType.LIVE_STREAM_VIEWS:
        // Stream ID format (flexible)
        return targetId.length > 0 && targetId.length <= 100;
        
      default:
        return true;
    }
  }
}

export default {
  PredictionType,
  MARKET_TEMPLATES,
  OutcomeCalculator,
  MarketValidator
};
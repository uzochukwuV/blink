/**
 * Advanced Analytics Dashboard
 * Creator performance tracking and market analysis
 */

import { Bet, Creator, Channel } from './types';
import { PredictionType } from './marketTypes';

// Analytics interfaces
export interface CreatorAnalytics {
  fid: number;
  username: string;
  displayName: string;
  timeframe: 'daily' | 'weekly' | 'monthly' | 'all-time';
  
  // Performance metrics
  totalBets: number;
  totalVolume: number; // USDC
  winRate: number;
  avgBetSize: number;
  totalProfit: number;
  roi: number; // Return on investment
  
  // Prediction accuracy by type
  predictionAccuracy: Record<PredictionType, {
    total: number;
    correct: number;
    accuracy: number;
    avgProfit: number;
  }>;
  
  // Engagement metrics
  followersGained: number;
  engagementRate: number;
  viralPosts: number;
  avgLikes: number;
  avgRecasts: number;
  
  // Market creation performance
  marketsCreated: number;
  avgMarketVolume: number;
  successfulMarkets: number; // Markets that reached threshold
  creatorRewardsEarned: number;
  
  // Trends
  performanceTrend: DataPoint[];
  volumeTrend: DataPoint[];
  accuracyTrend: DataPoint[];
}

export interface MarketAnalytics {
  marketId: string;
  title: string;
  type: PredictionType;
  creator: string;
  
  // Financial metrics
  totalVolume: number;
  yesPool: number;
  noPool: number;
  totalBets: number;
  avgBetSize: number;
  largestBet: number;
  
  // Participation metrics
  uniqueBettors: number;
  repeatBettors: number;
  newUserBets: number;
  
  // Outcome metrics
  finalOutcome: boolean | null;
  accuratePredictors: number;
  totalPayouts: number;
  houseProfitMargin: number;
  
  // Temporal data
  bettingActivity: TimeSeriesData[];
  volumeOverTime: TimeSeriesData[];
  oddsHistory: OddsHistoryPoint[];
  
  // Social metrics
  shares: number;
  comments: number;
  chatMessages: number;
  copiedBets: number;
  
  // Real-time tracking
  currentMetrics: {
    targetValue: number;
    currentValue: number;
    progressPercentage: number;
    timeRemaining: number;
    likelihood: number;
    lastUpdated: Date;
  };
}

export interface PortfolioAnalytics {
  userFid: number;
  totalInvested: number;
  currentValue: number;
  totalReturns: number;
  unrealizedPnL: number;
  realizedPnL: number;
  
  // Performance metrics
  winRate: number;
  avgHoldTime: number; // hours
  bestTrade: TradeResult;
  worstTrade: TradeResult;
  longestWinStreak: number;
  currentStreak: number;
  
  // Risk metrics
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
  varAtRisk: number; // Value at Risk (95% confidence)
  
  // Diversification
  typeDistribution: Record<PredictionType, number>;
  betSizeDistribution: {
    small: number; // < $5
    medium: number; // $5-$25
    large: number; // $25-$100
    whale: number; // > $100
  };
  
  // Active positions
  activeBets: PortfolioPosition[];
  
  // Historical performance
  performanceHistory: PerformanceSnapshot[];
}

export interface PortfolioPosition {
  betId: string;
  marketId: string;
  marketTitle: string;
  type: PredictionType;
  amount: number;
  outcome: boolean;
  entryDate: Date;
  currentOdds: number;
  entryOdds: number;
  unrealizedPnL: number;
  daysHeld: number;
  status: 'active' | 'settled' | 'expired';
}

export interface TradeResult {
  betId: string;
  marketTitle: string;
  amount: number;
  profit: number;
  roi: number;
  holdTime: number;
  date: Date;
}

export interface PerformanceSnapshot {
  date: Date;
  totalValue: number;
  dailyPnL: number;
  winRate: number;
  activeBets: number;
}

export interface DataPoint {
  timestamp: Date;
  value: number;
}

export interface TimeSeriesData {
  timestamp: Date;
  bets: number;
  volume: number;
  uniqueUsers: number;
}

export interface OddsHistoryPoint {
  timestamp: Date;
  yesOdds: number;
  noOdds: number;
  yesVolume: number;
  noVolume: number;
}

export interface RiskAssessment {
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  riskScore: number; // 0-100
  factors: RiskFactor[];
  recommendations: string[];
  positionSizing: number; // Recommended bet size in USDC
  diversificationScore: number; // 0-100
}

export interface RiskFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface SentimentAnalysis {
  marketId: string;
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
  confidenceScore: number; // 0-100
  
  // Text analysis from chat and social media
  positiveKeywords: string[];
  negativeKeywords: string[];
  emotionBreakdown: {
    excitement: number;
    fear: number;
    confidence: number;
    uncertainty: number;
  };
  
  // Social signals
  influencerOpinions: InfluencerOpinion[];
  communityConsensus: number; // -1 to 1
  discussionVolume: number;
  controversyScore: number; // 0-100
}

export interface InfluencerOpinion {
  fid: number;
  username: string;
  influence: number; // 0-100
  stance: 'bullish' | 'bearish' | 'neutral';
  confidence: number; // 0-100
  reasoning: string;
  timestamp: Date;
}

// Analytics service
export class AnalyticsService {
  /**
   * Get comprehensive creator analytics
   */
  async getCreatorAnalytics(
    fid: number, 
    timeframe: CreatorAnalytics['timeframe'] = 'monthly'
  ): Promise<CreatorAnalytics | null> {
    try {
      // Mock implementation - would query database and calculate metrics
      const analytics: CreatorAnalytics = {
        fid,
        username: 'creator123',
        displayName: 'Creator Name',
        timeframe,
        
        totalBets: 45,
        totalVolume: 1250.50,
        winRate: 0.67,
        avgBetSize: 27.80,
        totalProfit: 423.25,
        roi: 0.34,
        
        predictionAccuracy: {
          [PredictionType.VIRAL_CAST]: {
            total: 20,
            correct: 14,
            accuracy: 0.70,
            avgProfit: 15.50
          },
          [PredictionType.FOLLOWER_GROWTH]: {
            total: 15,
            correct: 9,
            accuracy: 0.60,
            avgProfit: 22.30
          },
          // ... other types
        } as any,
        
        followersGained: 120,
        engagementRate: 0.08,
        viralPosts: 3,
        avgLikes: 45,
        avgRecasts: 12,
        
        marketsCreated: 8,
        avgMarketVolume: 450.75,
        successfulMarkets: 5,
        creatorRewardsEarned: 89.15,
        
        performanceTrend: this.generateTrendData(),
        volumeTrend: this.generateTrendData(),
        accuracyTrend: this.generateTrendData()
      };
      
      return analytics;
    } catch (error) {
      console.error('Error getting creator analytics:', error);
      return null;
    }
  }

  /**
   * Get detailed market analytics
   */
  async getMarketAnalytics(marketId: string): Promise<MarketAnalytics | null> {
    try {
      // Mock implementation
      const analytics: MarketAnalytics = {
        marketId,
        title: "Will @vitalik's next post get 1000+ likes?",
        type: PredictionType.VIRAL_CAST,
        creator: 'creator123',
        
        totalVolume: 2450.75,
        yesPool: 1320.50,
        noPool: 1130.25,
        totalBets: 67,
        avgBetSize: 36.58,
        largestBet: 250.00,
        
        uniqueBettors: 52,
        repeatBettors: 15,
        newUserBets: 12,
        
        finalOutcome: null,
        accuratePredictors: 0,
        totalPayouts: 0,
        houseProfitMargin: 0.03,
        
        bettingActivity: this.generateTimeSeriesData(),
        volumeOverTime: this.generateTimeSeriesData(),
        oddsHistory: this.generateOddsHistory(),
        
        shares: 23,
        comments: 156,
        chatMessages: 89,
        copiedBets: 18,
        
        currentMetrics: {
          targetValue: 1000,
          currentValue: 734,
          progressPercentage: 73.4,
          timeRemaining: 18.5,
          likelihood: 0.65,
          lastUpdated: new Date()
        }
      };
      
      return analytics;
    } catch (error) {
      console.error('Error getting market analytics:', error);
      return null;
    }
  }

  /**
   * Get user portfolio analytics
   */
  async getPortfolioAnalytics(userFid: number): Promise<PortfolioAnalytics | null> {
    try {
      const analytics: PortfolioAnalytics = {
        userFid,
        totalInvested: 1500.00,
        currentValue: 1847.25,
        totalReturns: 347.25,
        unrealizedPnL: 125.50,
        realizedPnL: 221.75,
        
        winRate: 0.68,
        avgHoldTime: 32.5,
        bestTrade: {
          betId: 'bet_123',
          marketTitle: 'Viral prediction',
          amount: 50.00,
          profit: 85.00,
          roi: 1.70,
          holdTime: 24,
          date: new Date()
        },
        worstTrade: {
          betId: 'bet_456',
          marketTitle: 'Failed prediction',
          amount: 75.00,
          profit: -75.00,
          roi: -1.00,
          holdTime: 48,
          date: new Date()
        },
        longestWinStreak: 8,
        currentStreak: 3,
        
        sharpeRatio: 1.25,
        maxDrawdown: 0.15,
        volatility: 0.32,
        varAtRisk: 89.50,
        
        typeDistribution: {
          [PredictionType.VIRAL_CAST]: 0.40,
          [PredictionType.FOLLOWER_GROWTH]: 0.25,
          [PredictionType.CHANNEL_GROWTH]: 0.20,
          [PredictionType.CREATOR_MILESTONE]: 0.15
        } as any,
        
        betSizeDistribution: {
          small: 0.30,
          medium: 0.45,
          large: 0.20,
          whale: 0.05
        },
        
        activeBets: [],
        performanceHistory: []
      };
      
      return analytics;
    } catch (error) {
      console.error('Error getting portfolio analytics:', error);
      return null;
    }
  }

  /**
   * Assess risk for a potential bet
   */
  async assessRisk(
    userFid: number,
    marketId: string,
    betAmount: number,
    outcome: boolean
  ): Promise<RiskAssessment> {
    const portfolio = await this.getPortfolioAnalytics(userFid);
    const market = await this.getMarketAnalytics(marketId);
    
    let riskScore = 0;
    const factors: RiskFactor[] = [];
    
    // Portfolio concentration risk
    const positionSize = betAmount / (portfolio?.totalInvested || 1000);
    if (positionSize > 0.1) {
      riskScore += 25;
      factors.push({
        factor: 'Position Size',
        impact: 'negative',
        severity: positionSize > 0.2 ? 'high' : 'medium',
        description: `Bet represents ${(positionSize * 100).toFixed(1)}% of portfolio`
      });
    }
    
    // Market liquidity risk
    if (market && market.totalVolume < 100) {
      riskScore += 20;
      factors.push({
        factor: 'Low Liquidity',
        impact: 'negative',
        severity: 'medium',
        description: 'Market has low trading volume'
      });
    }
    
    // Time to expiration risk
    if (market && market.currentMetrics.timeRemaining < 2) {
      riskScore += 15;
      factors.push({
        factor: 'Time Decay',
        impact: 'negative',
        severity: 'medium',
        description: 'Market expires soon, reducing flexibility'
      });
    }
    
    // User experience factor
    if (portfolio && portfolio.totalInvested < 100) {
      riskScore += 10;
      factors.push({
        factor: 'New User',
        impact: 'negative',
        severity: 'low',
        description: 'Limited betting experience'
      });
    }
    
    // Positive factors
    if (portfolio && portfolio.winRate > 0.6) {
      riskScore -= 10;
      factors.push({
        factor: 'Good Track Record',
        impact: 'positive',
        severity: 'medium',
        description: `${(portfolio.winRate * 100).toFixed(1)}% win rate`
      });
    }
    
    const riskLevel: RiskAssessment['riskLevel'] = 
      riskScore < 20 ? 'low' :
      riskScore < 40 ? 'medium' :
      riskScore < 60 ? 'high' : 'extreme';
    
    const recommendations: string[] = [];
    if (riskScore > 40) {
      recommendations.push('Consider reducing bet size');
      recommendations.push('Diversify across multiple markets');
    }
    if (positionSize > 0.15) {
      recommendations.push('Bet size is large relative to portfolio');
    }
    
    return {
      riskLevel,
      riskScore: Math.min(100, riskScore),
      factors,
      recommendations,
      positionSizing: Math.max(5, Math.min(betAmount, (portfolio?.totalInvested || 1000) * 0.1)),
      diversificationScore: this.calculateDiversificationScore(portfolio)
    };
  }

  /**
   * Analyze market sentiment
   */
  async analyzeSentiment(marketId: string): Promise<SentimentAnalysis> {
    // Mock implementation - would analyze chat messages, social media, etc.
    return {
      marketId,
      overallSentiment: 'bullish',
      confidenceScore: 75,
      
      positiveKeywords: ['moon', 'bullish', 'confident', 'easy win'],
      negativeKeywords: ['dump', 'bearish', 'risky', 'avoid'],
      
      emotionBreakdown: {
        excitement: 0.45,
        fear: 0.15,
        confidence: 0.60,
        uncertainty: 0.25
      },
      
      influencerOpinions: [
        {
          fid: 123,
          username: 'crypto_guru',
          influence: 85,
          stance: 'bullish',
          confidence: 80,
          reasoning: 'Strong fundamentals and growing community',
          timestamp: new Date()
        }
      ],
      
      communityConsensus: 0.35,
      discussionVolume: 156,
      controversyScore: 25
    };
  }

  // Helper methods
  private generateTrendData(): DataPoint[] {
    const data: DataPoint[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      data.push({
        timestamp: new Date(now.getTime() - i * 24 * 60 * 60 * 1000),
        value: Math.random() * 100 + Math.sin(i / 5) * 20 + 50
      });
    }
    return data;
  }

  private generateTimeSeriesData(): TimeSeriesData[] {
    const data: TimeSeriesData[] = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      data.push({
        timestamp: new Date(now.getTime() - i * 60 * 60 * 1000),
        bets: Math.floor(Math.random() * 10 + 1),
        volume: Math.random() * 200 + 50,
        uniqueUsers: Math.floor(Math.random() * 15 + 5)
      });
    }
    return data;
  }

  private generateOddsHistory(): OddsHistoryPoint[] {
    const data: OddsHistoryPoint[] = [];
    const now = new Date();
    let yesVol = 500, noVol = 400;
    
    for (let i = 23; i >= 0; i--) {
      const total = yesVol + noVol;
      data.push({
        timestamp: new Date(now.getTime() - i * 60 * 60 * 1000),
        yesOdds: total / yesVol,
        noOdds: total / noVol,
        yesVolume: yesVol,
        noVolume: noVol
      });
      
      // Simulate volume changes
      yesVol += (Math.random() - 0.5) * 50;
      noVol += (Math.random() - 0.5) * 50;
    }
    
    return data;
  }

  private calculateDiversificationScore(portfolio: PortfolioAnalytics | null): number {
    if (!portfolio) return 0;
    
    // Calculate based on type distribution
    const typeValues = Object.values(portfolio.typeDistribution);
    const entropy = -typeValues.reduce((sum, p) => p > 0 ? sum + p * Math.log2(p) : sum, 0);
    const maxEntropy = Math.log2(Object.keys(portfolio.typeDistribution).length);
    
    return Math.round((entropy / maxEntropy) * 100);
  }
}

// Export singleton
export const analyticsService = new AnalyticsService();

export default {
  AnalyticsService,
  analyticsService
};
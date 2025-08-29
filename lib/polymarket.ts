/**
 * Polymarket Integration for Blink
 * 
 * This module provides integration with Polymarket's Gamma API to:
 * 1. Cross-reference similar markets for better odds discovery
 * 2. Get market trends and sentiment data
 * 3. Potentially bridge markets between platforms for better reach
 */

// Polymarket Gamma API base URL
const POLYMARKET_API_BASE = 'https://gamma-api.polymarket.com';

export interface PolymarketEvent {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  category: string;
  tags: string[];
  markets: PolymarketMarket[];
}

export interface PolymarketMarket {
  id: string;
  eventId: string;
  question: string;
  description: string;
  outcomes: string[];
  volume: number;
  liquidity: number;
  probabilities: number[];
  endDate: string;
  resolved: boolean;
  winningOutcome?: string;
  tags: string[];
}

export interface MarketTrends {
  similar_markets: PolymarketMarket[];
  trending_topics: string[];
  volume_trend: 'up' | 'down' | 'stable';
  sentiment_score: number; // -1 to 1
}

/**
 * Polymarket API client for fetching prediction market data
 */
export class PolymarketClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = POLYMARKET_API_BASE;
  }

  /**
   * Search for markets related to a given topic or question
   */
  async searchMarkets(query: string, limit: number = 10): Promise<PolymarketMarket[]> {
    try {
      const response = await fetch(`${this.baseUrl}/markets?search=${encodeURIComponent(query)}&limit=${limit}`);
      if (!response.ok) {
        throw new Error(`Polymarket API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.markets || [];
    } catch (error) {
      console.error('Error searching Polymarket markets:', error);
      return [];
    }
  }

  /**
   * Get trending markets from Polymarket
   */
  async getTrendingMarkets(category?: string, limit: number = 20): Promise<PolymarketMarket[]> {
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      params.append('order_by', 'volume');
      params.append('order_direction', 'desc');
      
      if (category) {
        params.append('category', category);
      }

      const response = await fetch(`${this.baseUrl}/markets?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Polymarket API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.markets || [];
    } catch (error) {
      console.error('Error fetching trending markets:', error);
      return [];
    }
  }

  /**
   * Get market by ID
   */
  async getMarket(marketId: string): Promise<PolymarketMarket | null> {
    try {
      const response = await fetch(`${this.baseUrl}/markets/${marketId}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Polymarket API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching Polymarket market:', error);
      return null;
    }
  }

  /**
   * Find similar markets based on keywords from a Blink market title
   */
  async findSimilarMarkets(blinkTitle: string): Promise<PolymarketMarket[]> {
    // Extract keywords from Blink market title
    const keywords = this.extractKeywords(blinkTitle);
    
    const similarMarkets: PolymarketMarket[] = [];
    
    // Search for each keyword
    for (const keyword of keywords) {
      const markets = await this.searchMarkets(keyword, 5);
      similarMarkets.push(...markets);
    }
    
    // Remove duplicates and sort by volume
    const uniqueMarkets = similarMarkets.filter((market, index, self) => 
      index === self.findIndex(m => m.id === market.id)
    ).sort((a, b) => b.volume - a.volume);
    
    return uniqueMarkets.slice(0, 10);
  }

  /**
   * Get market trends and analytics for cross-platform insights
   */
  async getMarketTrends(topic: string): Promise<MarketTrends> {
    try {
      const [similarMarkets, trendingMarkets] = await Promise.all([
        this.searchMarkets(topic, 5),
        this.getTrendingMarkets(undefined, 10)
      ]);

      // Extract trending topics from market titles
      const trendingTopics = trendingMarkets
        .flatMap(m => this.extractKeywords(m.question))
        .reduce((acc, topic) => {
          acc[topic] = (acc[topic] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      const topTopics = Object.entries(trendingTopics)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([topic]) => topic);

      // Calculate volume trend (simplified)
      const avgVolume = similarMarkets.reduce((sum, m) => sum + m.volume, 0) / similarMarkets.length;
      const recentAvgVolume = similarMarkets.slice(0, 3).reduce((sum, m) => sum + m.volume, 0) / 3;
      
      let volumeTrend: 'up' | 'down' | 'stable' = 'stable';
      if (recentAvgVolume > avgVolume * 1.2) volumeTrend = 'up';
      else if (recentAvgVolume < avgVolume * 0.8) volumeTrend = 'down';

      // Calculate sentiment (simplified - based on probability distributions)
      const sentimentScore = this.calculateSentimentScore(similarMarkets);

      return {
        similar_markets: similarMarkets,
        trending_topics: topTopics,
        volume_trend: volumeTrend,
        sentiment_score: sentimentScore
      };
    } catch (error) {
      console.error('Error getting market trends:', error);
      return {
        similar_markets: [],
        trending_topics: [],
        volume_trend: 'stable',
        sentiment_score: 0
      };
    }
  }

  /**
   * Extract meaningful keywords from market title
   */
  private extractKeywords(title: string): string[] {
    // Remove common words and extract meaningful terms
    const stopWords = new Set(['will', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'get', 'have', 'be', 'do']);
    
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 5); // Limit to top 5 keywords
  }

  /**
   * Calculate sentiment score based on market probabilities
   */
  private calculateSentimentScore(markets: PolymarketMarket[]): number {
    if (markets.length === 0) return 0;
    
    const avgProbability = markets.reduce((sum, market) => {
      // Assume first outcome is "YES/positive" 
      const firstOutcomeProb = market.probabilities[0] || 0.5;
      return sum + firstOutcomeProb;
    }, 0) / markets.length;
    
    // Convert probability to sentiment (-1 to 1)
    return (avgProbability - 0.5) * 2;
  }
}

/**
 * Helper functions for Blink-Polymarket integration
 */

/**
 * Convert Blink prediction type to Polymarket category
 */
export function blinkTypeToPolymarketCategory(predictionType: number): string {
  switch (predictionType) {
    case 0: // VIRAL_CAST
      return 'social-media';
    case 1: // POLL_OUTCOME
      return 'politics';
    case 2: // CHANNEL_GROWTH
      return 'social-media';
    case 3: // CREATOR_MILESTONE
      return 'entertainment';
    default:
      return 'misc';
  }
}

/**
 * Format Polymarket odds for display in Blink UI
 */
export function formatPolymarketOdds(probabilities: number[]): { yesOdds: number; noOdds: number } {
  const yesProb = probabilities[0] || 0.5;
  const noProb = 1 - yesProb;
  
  return {
    yesOdds: yesProb > 0 ? 1 / yesProb : 2.0,
    noOdds: noProb > 0 ? 1 / noProb : 2.0
  };
}

/**
 * Compare Blink market with similar Polymarket markets
 */
export function compareMarketOdds(
  blinkYesPool: number, 
  blinkNoPool: number, 
  polymarketProbabilities: number[]
): {
  blinkImpliedProb: number;
  polymarketImpliedProb: number;
  arbitrageOpportunity: boolean;
  recommendation: 'bet_yes' | 'bet_no' | 'hold';
} {
  const blinkTotal = blinkYesPool + blinkNoPool;
  const blinkImpliedProb = blinkTotal > 0 ? blinkYesPool / blinkTotal : 0.5;
  const polymarketImpliedProb = polymarketProbabilities[0] || 0.5;
  
  const probDiff = Math.abs(blinkImpliedProb - polymarketImpliedProb);
  const arbitrageOpportunity = probDiff > 0.1; // 10% difference threshold
  
  let recommendation: 'bet_yes' | 'bet_no' | 'hold' = 'hold';
  if (arbitrageOpportunity) {
    // If Polymarket shows higher YES probability, bet YES on Blink
    recommendation = polymarketImpliedProb > blinkImpliedProb ? 'bet_yes' : 'bet_no';
  }
  
  return {
    blinkImpliedProb,
    polymarketImpliedProb,
    arbitrageOpportunity,
    recommendation
  };
}

// Export singleton instance
export const polymarketClient = new PolymarketClient();
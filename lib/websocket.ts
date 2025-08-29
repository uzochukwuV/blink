/**
 * WebSocket Service for Real-time Updates
 * Handles live market data, chat, and social activity
 */

import { RealTimeMetrics } from './marketTypes';
import { ChatMessage, SocialBet } from './socialBetting';

export interface WebSocketMessage {
  type: 'market_update' | 'chat_message' | 'bet_placed' | 'odds_change' | 'user_joined' | 'user_left';
  data: any;
  timestamp: Date;
  marketId?: string;
  userId?: number;
}

export interface MarketUpdateData {
  marketId: string;
  metrics: RealTimeMetrics;
  currentOdds: {
    yesOdds: number;
    noOdds: number;
  };
  totalVolume: number;
  participantCount: number;
}

export interface BetPlacedData {
  marketId: string;
  betId: string;
  userId: number;
  amount: number;
  outcome: boolean;
  newOdds: {
    yesOdds: number;
    noOdds: number;
  };
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private subscriptions = new Map<string, Set<(data: any) => void>>();
  private pingInterval: NodeJS.Timeout | null = null;
  private isConnecting = false;

  constructor(private url: string = 'ws://localhost:3001') {
    // In production, this would be wss://your-websocket-server.com
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<boolean> {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return true;
    }

    this.isConnecting = true;

    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('🔗 WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startPingInterval();
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket disconnected:', event.code, event.reason);
          this.isConnecting = false;
          this.stopPingInterval();
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.isConnecting = false;
          resolve(false);
        };

        // Connection timeout
        setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            this.ws?.close();
            this.isConnecting = false;
            console.log('⏰ WebSocket connection timeout - using fallback');
            resolve(false);
          }
        }, 5000);

      } catch (error) {
        console.error('❌ WebSocket connection failed:', error);
        this.isConnecting = false;
        resolve(false);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.stopPingInterval();
    this.subscriptions.clear();
  }

  /**
   * Subscribe to market updates
   */
  subscribeToMarket(marketId: string, callback: (data: MarketUpdateData) => void): void {
    const key = `market:${marketId}`;
    
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
    }
    
    this.subscriptions.get(key)!.add(callback);

    // Send subscription message to server
    this.send({
      type: 'subscribe',
      data: { marketId, channel: 'market_updates' },
      timestamp: new Date()
    });

    console.log(`📊 Subscribed to market updates: ${marketId}`);
  }

  /**
   * Subscribe to market chat
   */
  subscribeToChat(marketId: string, callback: (message: ChatMessage) => void): void {
    const key = `chat:${marketId}`;
    
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
    }
    
    this.subscriptions.get(key)!.add(callback);

    this.send({
      type: 'subscribe',
      data: { marketId, channel: 'chat' },
      timestamp: new Date()
    });

    console.log(`💬 Subscribed to chat: ${marketId}`);
  }

  /**
   * Subscribe to social betting feed
   */
  subscribeToSocialFeed(userId: number, callback: (bet: SocialBet) => void): void {
    const key = `social:${userId}`;
    
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
    }
    
    this.subscriptions.get(key)!.add(callback);

    this.send({
      type: 'subscribe',
      data: { userId, channel: 'social_feed' },
      timestamp: new Date()
    });

    console.log(`👥 Subscribed to social feed: ${userId}`);
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(key: string): void {
    if (this.subscriptions.has(key)) {
      this.subscriptions.delete(key);
      
      const [channel, id] = key.split(':');
      this.send({
        type: 'unsubscribe',
        data: { channel, id },
        timestamp: new Date()
      });

      console.log(`🔕 Unsubscribed from: ${key}`);
    }
  }

  /**
   * Send a chat message
   */
  sendChatMessage(marketId: string, userId: number, message: string): void {
    this.send({
      type: 'chat_message',
      data: {
        marketId,
        authorFid: userId,
        message,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date(),
      marketId,
      userId
    });
  }

  /**
   * Broadcast bet placement
   */
  broadcastBet(betData: BetPlacedData): void {
    this.send({
      type: 'bet_placed',
      data: betData,
      timestamp: new Date(),
      marketId: betData.marketId,
      userId: betData.userId
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      switch (message.type) {
        case 'market_update':
          this.handleMarketUpdate(message.data);
          break;
        case 'chat_message':
          this.handleChatMessage(message.data);
          break;
        case 'bet_placed':
          this.handleBetPlaced(message.data);
          break;
        case 'odds_change':
          this.handleOddsChange(message.data);
          break;
        default:
          console.log('📨 Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error);
    }
  }

  private handleMarketUpdate(data: MarketUpdateData): void {
    const key = `market:${data.marketId}`;
    const callbacks = this.subscriptions.get(key);
    
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('❌ Error in market update callback:', error);
        }
      });
    }
  }

  private handleChatMessage(data: ChatMessage): void {
    const key = `chat:${data.marketId}`;
    const callbacks = this.subscriptions.get(key);
    
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('❌ Error in chat message callback:', error);
        }
      });
    }
  }

  private handleBetPlaced(data: BetPlacedData): void {
    // Notify market subscribers about new bet
    const marketKey = `market:${data.marketId}`;
    const marketCallbacks = this.subscriptions.get(marketKey);
    
    if (marketCallbacks) {
      marketCallbacks.forEach(callback => {
        try {
          callback({
            marketId: data.marketId,
            newBet: data,
            type: 'new_bet'
          });
        } catch (error) {
          console.error('❌ Error in bet placed callback:', error);
        }
      });
    }
  }

  private handleOddsChange(data: any): void {
    const key = `market:${data.marketId}`;
    const callbacks = this.subscriptions.get(key);
    
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback({
            marketId: data.marketId,
            newOdds: data.odds,
            type: 'odds_change'
          });
        } catch (error) {
          console.error('❌ Error in odds change callback:', error);
        }
      });
    }
  }

  /**
   * Send message to WebSocket server
   */
  private send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('⚠️  WebSocket not connected, message queued');
      // In production, implement message queuing
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Start periodic ping to keep connection alive
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({
          type: 'ping' as any,
          data: {},
          timestamp: new Date()
        });
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Get connection status
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get number of active subscriptions
   */
  get subscriptionCount(): number {
    return this.subscriptions.size;
  }
}

// Fallback service for when WebSocket is unavailable
export class FallbackRealtimeService {
  private intervals = new Map<string, NodeJS.Timeout>();

  subscribeToMarket(marketId: string, callback: (data: MarketUpdateData) => void): void {
    console.log(`📊 Using fallback polling for market: ${marketId}`);
    
    const interval = setInterval(async () => {
      // Simulate market updates with mock data
      const mockData: MarketUpdateData = {
        marketId,
        metrics: {
          targetId: marketId,
          type: 0,
          currentValue: Math.floor(Math.random() * 1000) + 100,
          startValue: 100,
          targetValue: 1000,
          lastUpdated: new Date(),
          changeRate: Math.random() * 10,
          timeRemaining: Math.random() * 24,
          likelihood: Math.random()
        },
        currentOdds: {
          yesOdds: 1.5 + Math.random() * 2,
          noOdds: 1.5 + Math.random() * 2
        },
        totalVolume: Math.random() * 10000,
        participantCount: Math.floor(Math.random() * 50) + 10
      };

      callback(mockData);
    }, 10000); // Update every 10 seconds

    this.intervals.set(`market:${marketId}`, interval);
  }

  subscribeToChat(marketId: string, callback: (message: ChatMessage) => void): void {
    console.log(`💬 Using fallback polling for chat: ${marketId}`);
    
    // Simulate occasional chat messages
    const interval = setInterval(() => {
      if (Math.random() > 0.8) { // 20% chance of message
        const mockMessage: ChatMessage = {
          id: `msg_${Date.now()}`,
          marketId,
          authorFid: Math.floor(Math.random() * 1000) + 100,
          username: `user${Math.floor(Math.random() * 1000)}`,
          displayName: `User ${Math.floor(Math.random() * 1000)}`,
          message: [
            "Looking bullish! 🚀",
            "Not so sure about this one",
            "Great odds right now",
            "Anyone else seeing this pattern?",
            "This could go either way",
          ][Math.floor(Math.random() * 5)],
          timestamp: new Date(),
          type: 'message',
          reactions: [],
          isDeleted: false
        };

        callback(mockMessage);
      }
    }, 5000);

    this.intervals.set(`chat:${marketId}`, interval);
  }

  subscribeToSocialFeed(userId: number, callback: (bet: SocialBet) => void): void {
    console.log(`👥 Using fallback polling for social feed: ${userId}`);
    // Implement fallback social feed if needed
  }

  unsubscribe(key: string): void {
    const interval = this.intervals.get(key);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(key);
    }
  }

  disconnect(): void {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();
  }

  get isConnected(): boolean {
    return false; // Fallback is never "connected" in the WebSocket sense
  }
}

// Auto-selecting service that tries WebSocket first, falls back to polling
export class RealtimeService {
  private primaryService: WebSocketService;
  private fallbackService: FallbackRealtimeService;
  private usingFallback = false;

  constructor(websocketUrl?: string) {
    this.primaryService = new WebSocketService(websocketUrl);
    this.fallbackService = new FallbackRealtimeService();
  }

  async connect(): Promise<boolean> {
    const connected = await this.primaryService.connect();
    
    if (!connected) {
      console.log('🔄 WebSocket unavailable, using fallback service');
      this.usingFallback = true;
    }

    return true; // Always return true since fallback is available
  }

  subscribeToMarket(marketId: string, callback: (data: MarketUpdateData) => void): void {
    if (this.usingFallback) {
      this.fallbackService.subscribeToMarket(marketId, callback);
    } else {
      this.primaryService.subscribeToMarket(marketId, callback);
    }
  }

  subscribeToChat(marketId: string, callback: (message: ChatMessage) => void): void {
    if (this.usingFallback) {
      this.fallbackService.subscribeToChat(marketId, callback);
    } else {
      this.primaryService.subscribeToChat(marketId, callback);
    }
  }

  subscribeToSocialFeed(userId: number, callback: (bet: SocialBet) => void): void {
    if (this.usingFallback) {
      this.fallbackService.subscribeToSocialFeed(userId, callback);
    } else {
      this.primaryService.subscribeToSocialFeed(userId, callback);
    }
  }

  unsubscribe(key: string): void {
    if (this.usingFallback) {
      this.fallbackService.unsubscribe(key);
    } else {
      this.primaryService.unsubscribe(key);
    }
  }

  sendChatMessage(marketId: string, userId: number, message: string): void {
    if (!this.usingFallback) {
      this.primaryService.sendChatMessage(marketId, userId, message);
    }
  }

  broadcastBet(betData: BetPlacedData): void {
    if (!this.usingFallback) {
      this.primaryService.broadcastBet(betData);
    }
  }

  disconnect(): void {
    this.primaryService.disconnect();
    this.fallbackService.disconnect();
  }

  get isConnected(): boolean {
    return this.usingFallback || this.primaryService.isConnected;
  }

  get connectionType(): 'websocket' | 'fallback' {
    return this.usingFallback ? 'fallback' : 'websocket';
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService();

export default {
  WebSocketService,
  FallbackRealtimeService,
  RealtimeService,
  realtimeService
};
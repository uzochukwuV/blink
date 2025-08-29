/**
 * Push Notification System for Blink
 * Handles web push notifications for bet updates, market events, and social activities
 */

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  actions?: NotificationAction[];
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export enum NotificationType {
  BET_WON = 'bet_won',
  BET_LOST = 'bet_lost',
  MARKET_SETTLED = 'market_settled',
  NEW_FOLLOWER = 'new_follower',
  BET_COPIED = 'bet_copied',
  GROUP_INVITE = 'group_invite',
  COMPETITION_STARTED = 'competition_started',
  BADGE_EARNED = 'badge_earned',
  MARKET_ENDING_SOON = 'market_ending_soon',
  ODDS_CHANGED = 'odds_changed'
}

// Notification templates
const NOTIFICATION_TEMPLATES: Record<NotificationType, (data: any) => NotificationPayload> = {
  [NotificationType.BET_WON]: (data) => ({
    title: "🎉 Bet Won!",
    body: `You won $${data.payout.toFixed(2)} on "${data.marketTitle}"`,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: { type: 'bet_won', betId: data.betId, marketId: data.marketId },
    actions: [
      { action: 'view_bet', title: 'View Bet', icon: '/icons/view.png' },
      { action: 'claim_winnings', title: 'Claim', icon: '/icons/money.png' }
    ]
  }),

  [NotificationType.BET_LOST]: (data) => ({
    title: "😔 Bet Lost",
    body: `Your bet on "${data.marketTitle}" didn't win this time`,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: { type: 'bet_lost', betId: data.betId, marketId: data.marketId },
    actions: [
      { action: 'view_bet', title: 'View Bet' },
      { action: 'find_similar', title: 'Find Similar Markets' }
    ]
  }),

  [NotificationType.MARKET_SETTLED]: (data) => ({
    title: "🏁 Market Settled",
    body: `"${data.marketTitle}" has been settled with outcome: ${data.outcome ? 'YES' : 'NO'}`,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: { type: 'market_settled', marketId: data.marketId },
    actions: [
      { action: 'view_market', title: 'View Market' },
      { action: 'check_bets', title: 'Check My Bets' }
    ]
  }),

  [NotificationType.NEW_FOLLOWER]: (data) => ({
    title: "👥 New Follower",
    body: `${data.followerName} is now following your bets`,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: { type: 'new_follower', followerId: data.followerId },
    actions: [
      { action: 'view_profile', title: 'View Profile' },
      { action: 'follow_back', title: 'Follow Back' }
    ]
  }),

  [NotificationType.BET_COPIED]: (data) => ({
    title: "📋 Bet Copied",
    body: `${data.copierName} copied your bet on "${data.marketTitle}"`,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: { type: 'bet_copied', betId: data.betId, copierId: data.copierId },
    actions: [
      { action: 'view_bet', title: 'View Bet' },
      { action: 'view_copier', title: 'View Copier' }
    ]
  }),

  [NotificationType.GROUP_INVITE]: (data) => ({
    title: "🎯 Group Invitation",
    body: `You've been invited to join "${data.groupName}" betting group`,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: { type: 'group_invite', groupId: data.groupId, inviterId: data.inviterId },
    actions: [
      { action: 'accept_invite', title: 'Accept' },
      { action: 'view_group', title: 'View Group' }
    ]
  }),

  [NotificationType.COMPETITION_STARTED]: (data) => ({
    title: "🏆 Competition Started",
    body: `"${data.competitionName}" has begun! Prize pool: $${data.prizePool}`,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: { type: 'competition_started', competitionId: data.competitionId },
    actions: [
      { action: 'join_competition', title: 'Join Now' },
      { action: 'view_leaderboard', title: 'Leaderboard' }
    ]
  }),

  [NotificationType.BADGE_EARNED]: (data) => ({
    title: "🏅 Badge Earned",
    body: `You earned the "${data.badgeName}" badge!`,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    image: data.badgeIcon,
    data: { type: 'badge_earned', badgeId: data.badgeId },
    actions: [
      { action: 'view_badges', title: 'View Badges' },
      { action: 'share_badge', title: 'Share' }
    ]
  }),

  [NotificationType.MARKET_ENDING_SOON]: (data) => ({
    title: "⏰ Market Ending Soon",
    body: `"${data.marketTitle}" closes in ${data.timeRemaining}`,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: { type: 'market_ending_soon', marketId: data.marketId },
    actions: [
      { action: 'place_bet', title: 'Bet Now' },
      { action: 'view_market', title: 'View Market' }
    ]
  }),

  [NotificationType.ODDS_CHANGED]: (data) => ({
    title: "📊 Odds Changed",
    body: `"${data.marketTitle}" odds shifted to ${data.newOdds.toFixed(2)}x`,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: { type: 'odds_changed', marketId: data.marketId, newOdds: data.newOdds },
    actions: [
      { action: 'view_market', title: 'View Market' },
      { action: 'place_bet', title: 'Place Bet' }
    ]
  })
};

export class NotificationService {
  private vapidKeys = {
    public: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
    private: process.env.VAPID_PRIVATE_KEY || ''
  };

  /**
   * Request permission for push notifications
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      console.warn('Push notifications not supported');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  /**
   * Subscribe user to push notifications
   */
  async subscribe(userId: string): Promise<string | null> {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push messaging not supported');
        return null;
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Subscribe user
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.vapidKeys.public)
        });
      }

      const subscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.getKey ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))) : '',
          auth: subscription.getKey ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))) : ''
        }
      };

      // Store subscription on server
      await this.storeSubscription(userId, subscriptionData);

      console.log('Push notification subscription successful');
      return subscription.endpoint;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  /**
   * Send notification to user
   */
  async sendNotification(
    userId: string, 
    type: NotificationType, 
    data: any
  ): Promise<boolean> {
    try {
      const payload = NOTIFICATION_TEMPLATES[type](data);
      
      // If running client-side, show local notification
      if (typeof window !== 'undefined') {
        return this.showLocalNotification(payload);
      }
      
      // Server-side: Send push notification
      return this.sendPushNotification(userId, payload);
    } catch (error) {
      console.error('Failed to send notification:', error);
      return false;
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendBulkNotifications(
    userIds: string[], 
    type: NotificationType, 
    data: any
  ): Promise<void> {
    const promises = userIds.map(userId => 
      this.sendNotification(userId, type, data)
    );
    
    await Promise.allSettled(promises);
  }

  /**
   * Show local notification (client-side)
   */
  private async showLocalNotification(payload: NotificationPayload): Promise<boolean> {
    if (!('Notification' in window)) return false;

    if (Notification.permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      
      await registration.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon,
        badge: payload.badge,
        image: payload.image,
        data: payload.data,
        actions: payload.actions,
        requireInteraction: true,
        tag: `blink_${payload.data?.type || 'general'}_${Date.now()}`
      });
      
      return true;
    }

    return false;
  }

  /**
   * Send push notification via server
   */
  private async sendPushNotification(userId: string, payload: NotificationPayload): Promise<boolean> {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          payload
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send push notification:', error);
      return false;
    }
  }

  /**
   * Store push subscription on server
   */
  private async storeSubscription(userId: string, subscription: any): Promise<void> {
    try {
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          subscription
        })
      });
    } catch (error) {
      console.error('Failed to store subscription:', error);
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(userId: string): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove subscription from server
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ userId })
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  /**
   * Get user's notification preferences
   */
  async getPreferences(userId: string): Promise<Record<NotificationType, boolean>> {
    try {
      const response = await fetch(`/api/notifications/preferences?userId=${userId}`);
      const data = await response.json();
      
      return data.preferences || this.getDefaultPreferences();
    } catch (error) {
      console.error('Failed to get notification preferences:', error);
      return this.getDefaultPreferences();
    }
  }

  /**
   * Update user's notification preferences
   */
  async updatePreferences(
    userId: string, 
    preferences: Partial<Record<NotificationType, boolean>>
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          preferences
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      return false;
    }
  }

  /**
   * Get default notification preferences
   */
  private getDefaultPreferences(): Record<NotificationType, boolean> {
    return {
      [NotificationType.BET_WON]: true,
      [NotificationType.BET_LOST]: true,
      [NotificationType.MARKET_SETTLED]: true,
      [NotificationType.NEW_FOLLOWER]: true,
      [NotificationType.BET_COPIED]: true,
      [NotificationType.GROUP_INVITE]: true,
      [NotificationType.COMPETITION_STARTED]: true,
      [NotificationType.BADGE_EARNED]: true,
      [NotificationType.MARKET_ENDING_SOON]: false, // Opt-in for frequent notifications
      [NotificationType.ODDS_CHANGED]: false // Opt-in for frequent notifications
    };
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }
}

// Notification trigger functions for different events
export class NotificationTriggers {
  private notificationService = new NotificationService();

  /**
   * Trigger notifications when a bet wins/loses
   */
  async onBetSettled(betId: string, didWin: boolean, payout?: number): Promise<void> {
    // This would be called from your bet settlement logic
    const betData = await this.getBetData(betId);
    if (!betData) return;

    const type = didWin ? NotificationType.BET_WON : NotificationType.BET_LOST;
    const data = {
      betId,
      marketId: betData.marketId,
      marketTitle: betData.marketTitle,
      payout: payout || 0
    };

    await this.notificationService.sendNotification(betData.userId, type, data);
  }

  /**
   * Trigger notifications when a market settles
   */
  async onMarketSettled(marketId: string, outcome: boolean): Promise<void> {
    const marketData = await this.getMarketData(marketId);
    if (!marketData) return;

    // Get all users who bet on this market
    const bettors = await this.getMarketBettors(marketId);
    
    const data = {
      marketId,
      marketTitle: marketData.title,
      outcome
    };

    await this.notificationService.sendBulkNotifications(
      bettors, 
      NotificationType.MARKET_SETTLED, 
      data
    );
  }

  /**
   * Trigger notifications when someone copies a bet
   */
  async onBetCopied(originalBetId: string, copierId: string): Promise<void> {
    const betData = await this.getBetData(originalBetId);
    if (!betData) return;

    const copierData = await this.getUserData(copierId);
    const data = {
      betId: originalBetId,
      marketTitle: betData.marketTitle,
      copierId,
      copierName: copierData?.displayName || 'Someone'
    };

    await this.notificationService.sendNotification(
      betData.userId, 
      NotificationType.BET_COPIED, 
      data
    );
  }

  /**
   * Trigger notifications for markets ending soon
   */
  async checkMarketsEndingSoon(): Promise<void> {
    const endingSoonMarkets = await this.getMarketsEndingSoon(2); // 2 hours
    
    for (const market of endingSoonMarkets) {
      const bettors = await this.getMarketBettors(market.id);
      const timeRemaining = this.formatTimeRemaining(market.deadline);
      
      const data = {
        marketId: market.id,
        marketTitle: market.title,
        timeRemaining
      };

      await this.notificationService.sendBulkNotifications(
        bettors,
        NotificationType.MARKET_ENDING_SOON,
        data
      );
    }
  }

  // Helper methods (these would integrate with your actual data layer)
  private async getBetData(betId: string): Promise<any> {
    // Mock implementation - integrate with your KV store or database
    return {
      id: betId,
      userId: 'user-123',
      marketId: 'market-456',
      marketTitle: 'Sample Market'
    };
  }

  private async getMarketData(marketId: string): Promise<any> {
    return {
      id: marketId,
      title: 'Sample Market',
      deadline: new Date()
    };
  }

  private async getUserData(userId: string): Promise<any> {
    return {
      id: userId,
      displayName: 'User Name'
    };
  }

  private async getMarketBettors(marketId: string): Promise<string[]> {
    return ['user-1', 'user-2', 'user-3'];
  }

  private async getMarketsEndingSoon(hours: number): Promise<any[]> {
    return [];
  }

  private formatTimeRemaining(deadline: Date): string {
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }
}

// Export singleton instances
export const notificationService = new NotificationService();
export const notificationTriggers = new NotificationTriggers();

export default {
  NotificationService,
  NotificationTriggers,
  NotificationType,
  notificationService,
  notificationTriggers
};
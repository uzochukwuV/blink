import React, { useState, useEffect } from 'react';
import { CreatorAnalytics, PortfolioAnalytics, MarketAnalytics, analyticsService } from '~/lib/analytics';
import { PredictionType } from '~/lib/marketTypes';

interface AnalyticsDashboardProps {
  userFid: number;
  className?: string;
}

export function AnalyticsDashboard({ userFid, className = '' }: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'portfolio' | 'performance' | 'markets'>('overview');
  const [creatorAnalytics, setCreatorAnalytics] = useState<CreatorAnalytics | null>(null);
  const [portfolioAnalytics, setPortfolioAnalytics] = useState<PortfolioAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      try {
        const [creator, portfolio] = await Promise.all([
          analyticsService.getCreatorAnalytics(userFid, 'monthly'),
          analyticsService.getPortfolioAnalytics(userFid)
        ]);
        
        setCreatorAnalytics(creator);
        setPortfolioAnalytics(portfolio);
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [userFid]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'portfolio', label: 'Portfolio', icon: '💼' },
    { id: 'performance', label: 'Performance', icon: '📈' },
    { id: 'markets', label: 'Markets', icon: '🎯' }
  ] as const;

  if (loading) {
    return (
      <div className={className}>
        <div className="animate-pulse space-y-6">
          {/* Tab skeleton */}
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-10 w-24 bg-muted rounded-lg"></div>
            ))}
          </div>
          
          {/* Content skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-card rounded-xl p-6 border border-border">
                <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab 
          creatorAnalytics={creatorAnalytics} 
          portfolioAnalytics={portfolioAnalytics} 
        />
      )}
      {activeTab === 'portfolio' && (
        <PortfolioTab portfolioAnalytics={portfolioAnalytics} />
      )}
      {activeTab === 'performance' && (
        <PerformanceTab creatorAnalytics={creatorAnalytics} />
      )}
      {activeTab === 'markets' && (
        <MarketsTab userFid={userFid} />
      )}
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ 
  creatorAnalytics, 
  portfolioAnalytics 
}: { 
  creatorAnalytics: CreatorAnalytics | null;
  portfolioAnalytics: PortfolioAnalytics | null;
}) {
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Profit"
          value={formatCurrency(portfolioAnalytics?.totalReturns || 0)}
          trend={portfolioAnalytics?.totalReturns || 0 >= 0 ? 'up' : 'down'}
          subtitle="All time"
        />
        <MetricCard
          title="Win Rate"
          value={formatPercentage(creatorAnalytics?.winRate || 0)}
          trend={creatorAnalytics?.winRate || 0 >= 0.5 ? 'up' : 'down'}
          subtitle="This month"
        />
        <MetricCard
          title="Total Volume"
          value={formatCurrency(creatorAnalytics?.totalVolume || 0)}
          trend="up"
          subtitle="This month"
        />
        <MetricCard
          title="Active Positions"
          value={portfolioAnalytics?.activeBets.length.toString() || '0'}
          trend="stable"
          subtitle="Open bets"
        />
      </div>

      {/* Recent Performance Chart */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">Performance Trend</h3>
        <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
          <div className="text-center">
            <div className="text-4xl mb-2">📈</div>
            <div className="text-muted-foreground">Performance chart would go here</div>
            <div className="text-sm text-muted-foreground">(Integration with charting library needed)</div>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Betting Activity */}
        <div className="bg-card rounded-xl p-6 border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Betting Activity</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Bets</span>
              <span className="font-semibold">{creatorAnalytics?.totalBets || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Average Bet Size</span>
              <span className="font-semibold">{formatCurrency(creatorAnalytics?.avgBetSize || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Streak</span>
              <span className="font-semibold">{portfolioAnalytics?.currentStreak || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ROI</span>
              <span className={`font-semibold ${(creatorAnalytics?.roi || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatPercentage(creatorAnalytics?.roi || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Risk Metrics */}
        <div className="bg-card rounded-xl p-6 border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Risk Analysis</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sharpe Ratio</span>
              <span className="font-semibold">{portfolioAnalytics?.sharpeRatio.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max Drawdown</span>
              <span className="font-semibold text-red-500">
                {formatPercentage(portfolioAnalytics?.maxDrawdown || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Volatility</span>
              <span className="font-semibold">{formatPercentage(portfolioAnalytics?.volatility || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">VaR (95%)</span>
              <span className="font-semibold text-red-500">
                {formatCurrency(portfolioAnalytics?.varAtRisk || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Portfolio Tab Component
function PortfolioTab({ portfolioAnalytics }: { portfolioAnalytics: PortfolioAnalytics | null }) {
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-xl p-6 border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-2">Portfolio Value</h3>
          <div className="text-3xl font-bold text-foreground mb-1">
            {formatCurrency(portfolioAnalytics?.currentValue || 0)}
          </div>
          <div className={`text-sm ${(portfolioAnalytics?.totalReturns || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {(portfolioAnalytics?.totalReturns || 0) >= 0 ? '+' : ''}{formatCurrency(portfolioAnalytics?.totalReturns || 0)} returns
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-2">Unrealized P&L</h3>
          <div className={`text-3xl font-bold mb-1 ${(portfolioAnalytics?.unrealizedPnL || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {(portfolioAnalytics?.unrealizedPnL || 0) >= 0 ? '+' : ''}{formatCurrency(portfolioAnalytics?.unrealizedPnL || 0)}
          </div>
          <div className="text-sm text-muted-foreground">
            From {portfolioAnalytics?.activeBets.length || 0} active positions
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-2">Realized P&L</h3>
          <div className={`text-3xl font-bold mb-1 ${(portfolioAnalytics?.realizedPnL || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {(portfolioAnalytics?.realizedPnL || 0) >= 0 ? '+' : ''}{formatCurrency(portfolioAnalytics?.realizedPnL || 0)}
          </div>
          <div className="text-sm text-muted-foreground">
            From closed positions
          </div>
        </div>
      </div>

      {/* Active Positions */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">Active Positions</h3>
        {portfolioAnalytics?.activeBets.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-2">No active positions</div>
            <div className="text-sm text-muted-foreground">Your open bets will appear here</div>
          </div>
        ) : (
          <div className="space-y-3">
            {portfolioAnalytics?.activeBets.map((position) => (
              <div key={position.betId} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-foreground">{position.marketTitle}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(position.amount)} • {position.outcome ? 'YES' : 'NO'} • {position.daysHeld}d held
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-semibold ${position.unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {position.unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(position.unrealizedPnL)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {position.currentOdds.toFixed(2)}x odds
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Diversification */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">Diversification</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-foreground mb-3">By Market Type</h4>
            <div className="space-y-2">
              {portfolioAnalytics && Object.entries(portfolioAnalytics.typeDistribution).map(([type, percentage]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground capitalize">
                    {type.replace('_', ' ').toLowerCase()}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-muted rounded-full">
                      <div 
                        className="h-full bg-primary rounded-full" 
                        style={{ width: `${percentage * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-12">
                      {(percentage * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-foreground mb-3">By Bet Size</h4>
            <div className="space-y-2">
              {portfolioAnalytics && Object.entries(portfolioAnalytics.betSizeDistribution).map(([size, percentage]) => (
                <div key={size} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground capitalize">{size}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-muted rounded-full">
                      <div 
                        className="h-full bg-secondary rounded-full" 
                        style={{ width: `${percentage * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-12">
                      {(percentage * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Performance Tab Component
function PerformanceTab({ creatorAnalytics }: { creatorAnalytics: CreatorAnalytics | null }) {
  return (
    <div className="space-y-6">
      {/* Prediction Accuracy by Type */}
      <div className="bg-card rounded-xl p-6 border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">Prediction Accuracy by Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {creatorAnalytics && Object.entries(creatorAnalytics.predictionAccuracy).map(([type, stats]) => (
            <div key={type} className="p-4 bg-muted rounded-lg">
              <div className="font-medium text-foreground mb-2 capitalize">
                {type.replace('_', ' ').toLowerCase()}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Accuracy</div>
                  <div className="font-semibold">{(stats.accuracy * 100).toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Avg Profit</div>
                  <div className="font-semibold">${stats.avgProfit.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Total</div>
                  <div className="font-semibold">{stats.total}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Correct</div>
                  <div className="font-semibold text-green-500">{stats.correct}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Social Metrics */}
      {creatorAnalytics && (
        <div className="bg-card rounded-xl p-6 border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Social Impact</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{creatorAnalytics.followersGained}</div>
              <div className="text-sm text-muted-foreground">Followers Gained</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{creatorAnalytics.viralPosts}</div>
              <div className="text-sm text-muted-foreground">Viral Posts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{creatorAnalytics.avgLikes}</div>
              <div className="text-sm text-muted-foreground">Avg Likes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {(creatorAnalytics.engagementRate * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Engagement Rate</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Markets Tab Component
function MarketsTab({ userFid }: { userFid: number }) {
  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl p-6 border border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">Market Analysis</h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🎯</div>
          <div className="text-muted-foreground">Market analysis features coming soon</div>
          <div className="text-sm text-muted-foreground mt-2">
            This will include market performance, trending markets, and detailed analytics
          </div>
        </div>
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({ 
  title, 
  value, 
  trend, 
  subtitle 
}: {
  title: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
  subtitle: string;
}) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <span className="text-green-500">↗️</span>;
      case 'down': return <span className="text-red-500">↘️</span>;
      default: return <span className="text-gray-500">→</span>;
    }
  };

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {getTrendIcon()}
      </div>
      <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
      <div className="text-xs text-muted-foreground">{subtitle}</div>
    </div>
  );
}
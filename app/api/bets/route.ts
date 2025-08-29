import { NextRequest, NextResponse } from "next/server";
import { kv } from "~/lib/kv";
import { Bet } from "~/lib/types";
import { randomUUID } from "crypto";
import { realtimeService } from "~/lib/websocket";
import { analyticsService } from "~/lib/analytics";

const userId = "user-demo";
function getKey(status: "open"|"completed") { return `bets:${userId}:${status}`; }

// Enhanced GET endpoint with filtering and real-time data
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status") === "completed" ? "completed" : "open";
    const marketId = url.searchParams.get("marketId");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const userId = url.searchParams.get("userId") || "user-demo";
    
    // Get bets from KV store (maintaining compatibility)
    let bets: Bet[] = (await kv.get(`bets:${userId}:${status}`)) || [];
    
    // Filter by marketId if specified
    if (marketId) {
      bets = bets.filter(bet => bet.marketId === marketId);
    }
    
    // Limit results
    bets = bets.slice(0, limit);
    
    // Enhance with real-time market data
    const enhancedBets = await Promise.all(
      bets.map(async (bet) => {
        try {
          // Get current market data
          const marketData = await kv.get(`market:${bet.marketId}`);
          
          // Calculate current value if market is still open
          if (bet.status === 'open' && marketData) {
            const currentOdds = bet.side === 'yes' 
              ? marketData.yesOdds || 2.0
              : marketData.noOdds || 2.0;
            
            const potentialPayout = bet.amount * currentOdds;
            const unrealizedPnL = potentialPayout - bet.amount;
            
            return {
              ...bet,
              currentOdds,
              potentialPayout,
              unrealizedPnL,
              marketData: {
                title: bet.marketTitle,
                deadline: marketData?.deadline,
                status: marketData?.status || 'active'
              }
            };
          }
          
          return bet;
        } catch (error) {
          console.error('Error enhancing bet data:', error);
          return bet;
        }
      })
    );
    
    return NextResponse.json({ 
      success: true,
      data: enhancedBets,
      pagination: {
        limit,
        total: enhancedBets.length
      }
    });
  } catch (error) {
    console.error('Error fetching bets:', error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch bets" }, 
      { status: 500 }
    );
  }
}

// Enhanced POST endpoint with validation and real-time updates
export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    
    const { 
      marketId, 
      marketTitle, 
      amount, 
      side, 
      notes,
      isPublic = true,
      userId: reqUserId = "user-demo"
    } = body || {};
    
    // Enhanced validation
    if (!marketId || !amount || !side || !["yes", "no"].includes(side)) {
      return NextResponse.json({ error: "Invalid bet data" }, { status: 400 });
    }
    
    if (amount <= 0 || amount > 1000) {
      return NextResponse.json({ error: "Invalid bet amount" }, { status: 400 });
    }
    
    // Check if market exists and is active
    const marketData = await kv.get(`market:${marketId}`);
    if (!marketData) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 });
    }
    
    if (marketData.status !== 'active') {
      return NextResponse.json({ error: "Market is not active" }, { status: 400 });
    }
    
    if (new Date() >= new Date(marketData.deadline)) {
      return NextResponse.json({ error: "Market has expired" }, { status: 400 });
    }
    
    // Calculate current odds
    const totalPool = (marketData.yesPool || 0) + (marketData.noPool || 0);
    let currentOdds = 2.0; // Default
    
    if (totalPool > 0) {
      const targetPool = side === 'yes' ? marketData.yesPool : marketData.noPool;
      currentOdds = Math.max(1.01, totalPool / Math.max(targetPool || 0.01, 0.01));
    }
    
    // Create enhanced bet object
    const bet: Bet = {
      id: randomUUID(),
      marketId,
      marketTitle: marketTitle || marketData.title,
      userId: reqUserId,
      amount: Number(amount),
      side,
      status: "open",
      createdAt: new Date().toISOString(),
      notes,
      // Enhanced fields
      odds: currentOdds,
      isPublic,
      potentialPayout: amount * currentOdds
    };
    
    // Store bet in KV (maintaining compatibility)
    const openBets: Bet[] = (await kv.get(getKey("open"))) || [];
    openBets.unshift(bet);
    await kv.set(getKey("open"), openBets);
    
    // Update market pools
    const updatedMarketData = {
      ...marketData,
      yesPool: side === 'yes' 
        ? (marketData.yesPool || 0) + amount 
        : marketData.yesPool || 0,
      noPool: side === 'no' 
        ? (marketData.noPool || 0) + amount 
        : marketData.noPool || 0,
      totalVolume: (marketData.totalVolume || 0) + amount,
      totalBets: (marketData.totalBets || 0) + 1
    };
    
    await kv.set(`market:${marketId}`, updatedMarketData);
    
    // Update user stats
    const userStats = (await kv.get(`user:${reqUserId}:stats`)) || {
      totalBets: 0,
      totalVolume: 0,
      winRate: 0,
      currentStreak: 0
    };
    
    userStats.totalBets += 1;
    userStats.totalVolume += amount;
    
    await kv.set(`user:${reqUserId}:stats`, userStats);
    
    // Create social bet if public
    if (isPublic) {
      const socialBet = {
        id: randomUUID(),
        betId: bet.id,
        userId: reqUserId,
        marketId,
        amount,
        outcome: side === 'yes',
        timestamp: new Date().toISOString(),
        isPublic: true,
        note: notes,
        followers: [],
        copiedBy: []
      };
      
      const socialBets = (await kv.get('social:bets')) || [];
      socialBets.unshift(socialBet);
      await kv.set('social:bets', socialBets.slice(0, 100)); // Keep last 100
    }
    
    // Broadcast bet placement via WebSocket
    try {
      const newOdds = {
        yesOdds: (updatedMarketData.yesPool + updatedMarketData.noPool) / Math.max(updatedMarketData.yesPool, 0.01),
        noOdds: (updatedMarketData.yesPool + updatedMarketData.noPool) / Math.max(updatedMarketData.noPool, 0.01)
      };
      
      realtimeService.broadcastBet({
        marketId,
        betId: bet.id,
        userId: reqUserId,
        amount: Number(amount),
        outcome: side === 'yes',
        newOdds
      });
    } catch (wsError) {
      console.error('WebSocket broadcast failed:', wsError);
      // Continue without WebSocket
    }
    
    // Risk assessment
    try {
      const riskAssessment = await analyticsService.assessRisk(
        reqUserId,
        marketId,
        Number(amount),
        side === 'yes'
      );
      
      return NextResponse.json({
        success: true,
        data: {
          ...bet,
          riskAssessment
        }
      }, { status: 201 });
    } catch (analyticsError) {
      console.error('Analytics assessment failed:', analyticsError);
      
      return NextResponse.json({
        success: true,
        data: bet
      }, { status: 201 });
    }
    
  } catch (error) {
    console.error('Error placing bet:', error);
    return NextResponse.json(
      { success: false, error: "Failed to place bet" }, 
      { status: 500 }
    );
  }
}
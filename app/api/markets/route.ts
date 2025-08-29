import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { farcasterDataProvider } from '~/lib/farcasterData';
import { MarketValidator, PredictionType } from '~/lib/marketTypes';
import { blinkContract } from '~/lib/contracts';

const prisma = new PrismaClient();

// GET /api/markets - Get all markets with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const status = searchParams.get('status') || 'ACTIVE';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: any = {
      status: status as any
    };

    if (type) {
      where.type = type as PredictionType;
    }

    if (category) {
      where.category = category;
    }

    // Fetch markets with relations
    const markets = await prisma.market.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            pfpUrl: true,
            isVerified: true
          }
        },
        bets: {
          select: {
            id: true,
            amount: true,
            outcome: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        },
        _count: {
          select: {
            bets: true,
            chatMessages: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    });

    // Enhance with real-time data
    const enhancedMarkets = await Promise.all(
      markets.map(async (market) => {
        let currentMetrics = null;
        
        try {
          // Get real-time metrics based on market type
          switch (market.type) {
            case 'VIRAL_CAST':
            case 'TRENDING_CAST':
              currentMetrics = await farcasterDataProvider.getCastMetrics(market.targetId);
              break;
            case 'FOLLOWER_GROWTH':
            case 'CREATOR_MILESTONE':
              const fid = parseInt(market.targetId);
              if (!isNaN(fid)) {
                currentMetrics = await farcasterDataProvider.getCreatorMetrics(fid);
              }
              break;
            case 'CHANNEL_GROWTH':
              currentMetrics = await farcasterDataProvider.getChannelMetrics(market.targetId);
              break;
            default:
              currentMetrics = null;
          }
        } catch (error) {
          console.error('Error fetching real-time metrics:', error);
        }

        // Calculate current odds
        const totalPool = Number(market.yesPool) + Number(market.noPool);
        const yesOdds = totalPool > 0 ? totalPool / Number(market.yesPool) : 2.0;
        const noOdds = totalPool > 0 ? totalPool / Number(market.noPool) : 2.0;

        return {
          ...market,
          currentMetrics,
          odds: {
            yes: Math.max(1.01, yesOdds),
            no: Math.max(1.01, noOdds)
          },
          totalVolume: Number(market.totalVolume),
          yesPool: Number(market.yesPool),
          noPool: Number(market.noPool),
          creatorStake: Number(market.creatorStake)
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: enhancedMarkets,
      pagination: {
        limit,
        offset,
        total: enhancedMarkets.length
      }
    });

  } catch (error) {
    console.error('Error fetching markets:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch markets' },
      { status: 500 }
    );
  }
}

// POST /api/markets - Create a new market
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type,
      title,
      description,
      targetId,
      threshold,
      duration,
      creatorStake,
      category,
      tags,
      creatorId
    } = body;

    // Validate request data
    const validation = MarketValidator.validateMarket({
      type,
      title,
      targetId,
      threshold,
      duration,
      creatorStake,
      category,
      tags
    });

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: creatorId }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate deadline
    const deadline = new Date(Date.now() + duration * 60 * 60 * 1000);

    // Create market in database
    const market = await prisma.market.create({
      data: {
        type: type as PredictionType,
        title,
        description,
        targetId,
        threshold,
        duration,
        deadline,
        creatorStake,
        category: category || 'general',
        tags: tags || [],
        creatorId,
        isPublic: true
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            pfpUrl: true
          }
        }
      }
    });

    // Create market on smart contract (if available)
    try {
      // This would integrate with your smart contract
      console.log('Creating market on smart contract:', {
        type,
        title,
        targetId,
        threshold,
        duration,
        creatorStake
      });
      
      // Update market with onchain ID once deployed
      // await prisma.market.update({
      //   where: { id: market.id },
      //   data: { onchainId: contractMarketId }
      // });
    } catch (contractError) {
      console.error('Smart contract creation failed:', contractError);
      // Continue with off-chain market for now
    }

    // Update user stats
    await prisma.userStats.upsert({
      where: { userId: creatorId },
      create: {
        userId: creatorId,
        marketsCreated: 1
      },
      update: {
        marketsCreated: {
          increment: 1
        }
      }
    });

    // Subscribe to real-time updates for this market
    farcasterDataProvider.subscribeToUpdates(targetId, (metrics) => {
      // Update metrics cache
      prisma.metricsCache.upsert({
        where: { targetId },
        create: {
          targetId,
          targetType: type,
          currentValue: metrics.currentValue,
          startValue: metrics.startValue,
          targetValue: metrics.targetValue,
          changeRate: metrics.changeRate,
          likelihood: metrics.likelihood,
          lastUpdated: new Date()
        },
        update: {
          currentValue: metrics.currentValue,
          changeRate: metrics.changeRate,
          likelihood: metrics.likelihood,
          lastUpdated: new Date(),
          isStale: false
        }
      }).catch(console.error);
    });

    return NextResponse.json({
      success: true,
      data: {
        ...market,
        creatorStake: Number(market.creatorStake),
        totalVolume: Number(market.totalVolume),
        yesPool: Number(market.yesPool),
        noPool: Number(market.noPool)
      }
    });

  } catch (error) {
    console.error('Error creating market:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create market' },
      { status: 500 }
    );
  }
}
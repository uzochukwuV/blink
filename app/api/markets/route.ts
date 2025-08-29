import { NextRequest, NextResponse } from 'next/server';
import { farcasterDataProvider } from '~/lib/farcasterData';
import { PredictionType as UiPredictionType } from '~/lib/marketTypes';
import { blinkContract, PredictionType as ChainPredictionType } from '~/lib/contracts';

// GET /api/markets - Read onchain active markets, optional type filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get('type'); // may be string name or number
    const limit = parseInt(searchParams.get('limit') || '20');

    let type: number = ChainPredictionType.VIRAL_CAST;
    if (typeParam) {
      // allow numeric
      if (/^\d+$/.test(typeParam)) {
        type = parseInt(typeParam, 10);
      } else {
        // map string to enum
        const map: Record<string, number> = {
          VIRAL_CAST: ChainPredictionType.VIRAL_CAST,
          POLL_OUTCOME: ChainPredictionType.POLL_OUTCOME,
          CHANNEL_GROWTH: ChainPredictionType.CHANNEL_GROWTH,
          CREATOR_MILESTONE: ChainPredictionType.CREATOR_MILESTONE,
        };
        if (typeParam in map) type = map[typeParam];
      }
    }

    const markets = await blinkContract.getActiveMarkets(type as ChainPredictionType, limit);

    // Optional enrichment via Neynar (errors ignored)
    const enriched = await Promise.all(
      markets.map(async (m) => {
        let currentMetrics: any = null;
        try {
          if (m.predictionType === ChainPredictionType.VIRAL_CAST) {
            currentMetrics = await farcasterDataProvider.getCastMetrics(m.targetId);
          } else if (m.predictionType === ChainPredictionType.CREATOR_MILESTONE) {
            const fid = parseInt(m.targetId);
            if (!isNaN(fid)) currentMetrics = await farcasterDataProvider.getCreatorMetrics(fid);
          } else if (m.predictionType === ChainPredictionType.CHANNEL_GROWTH) {
            currentMetrics = await farcasterDataProvider.getChannelMetrics(m.targetId);
          }
        } catch (e) {
          // ignore enrichment errors
        }

        const yesPool = Number(m.yesPool) / 1e6;
        const noPool = Number(m.noPool) / 1e6;
        const total = yesPool + noPool;
        const yesOdds = total > 0 && yesPool > 0 ? total / yesPool : 2.0;
        const noOdds = total > 0 && noPool > 0 ? total / noPool : 2.0;

        return {
          id: m.id,
          type: m.predictionType,
          title: m.title,
          targetId: m.targetId,
          threshold: m.threshold,
          deadline: m.deadline,
          status: m.status,
          yesPool,
          noPool,
          totalVolume: Number(m.totalVolume) / 1e6,
          creatorStake: Number(m.creatorStake) / 1e6,
          creator: m.creator,
          odds: { yes: Math.max(1.01, yesOdds), no: Math.max(1.01, noOdds) },
          currentMetrics,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: enriched,
      pagination: { limit, total: enriched.length },
    });
  } catch (error) {
    console.error('Error fetching markets (onchain):', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch onchain markets' },
      { status: 500 }
    );
  }
}

// POST /api/markets - disabled; create markets client-side using Base Account
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Create market from client using Base Account (approve USDC + createMarket).',
    },
    { status: 405 }
  );
}
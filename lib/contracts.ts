import { createPublicClient, http, parseEther, formatEther } from 'viem';
import { base } from 'viem/chains';
import { sendBaseAccountTransaction, isBaseAccountAvailable } from './baseAccount';

// Enhanced Blink contract ABI with creator-sponsored betting
export const BLINK_ABI = [
  // Read functions
  {
    inputs: [{ name: '_marketId', type: 'uint256' }],
    name: 'markets',
    outputs: [
      { name: 'id', type: 'uint32' },
      { name: 'predictionType', type: 'uint8' },
      { name: 'title', type: 'string' },
      { name: 'targetId', type: 'string' },
      { name: 'threshold', type: 'uint32' },
      { name: 'deadline', type: 'uint32' },
      { name: 'yesPool', type: 'uint128' },
      { name: 'noPool', type: 'uint128' },
      { name: 'status', type: 'uint8' },
      { name: 'outcome', type: 'bool' },
      { name: 'creator', type: 'address' },
      { name: 'creatorStake', type: 'uint128' },
      { name: 'totalVolume', type: 'uint128' },
      { name: 'creatorRewarded', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: '_user', type: 'address' }],
    name: 'getUserProfile',
    outputs: [
      { name: 'totalBets', type: 'uint256' },
      { name: 'winStreak', type: 'uint256' },
      { name: 'maxStreak', type: 'uint256' },
      { name: 'communityPoints', type: 'uint256' },
      { name: 'sharesGenerated', type: 'uint256' },
      { name: 'correctPredictions', type: 'uint256' },
      { name: 'following', type: 'address[]' },
      { name: 'lastActive', type: 'uint256' },
      { name: 'tier', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: '_type', type: 'uint8' },
      { name: '_limit', type: 'uint32' }
    ],
    name: 'getActiveMarkets',
    outputs: [{ name: 'markets', type: 'tuple[]', components: [
      { name: 'id', type: 'uint32' },
      { name: 'predictionType', type: 'uint8' },
      { name: 'title', type: 'string' },
      { name: 'targetId', type: 'string' },
      { name: 'threshold', type: 'uint32' },
      { name: 'deadline', type: 'uint32' },
      { name: 'yesPool', type: 'uint128' },
      { name: 'noPool', type: 'uint128' },
      { name: 'status', type: 'uint8' },
      { name: 'outcome', type: 'bool' },
      { name: 'creator', type: 'address' },
      { name: 'creatorStake', type: 'uint128' },
      { name: 'totalVolume', type: 'uint128' },
      { name: 'creatorRewarded', type: 'bool' }
    ]}],
    stateMutability: 'view',
    type: 'function'
  },
  // Write functions
  {
    inputs: [
      { name: '_type', type: 'uint8' },
      { name: '_title', type: 'string' },
      { name: '_targetId', type: 'string' },
      { name: '_threshold', type: 'uint32' },
      { name: '_duration', type: 'uint32' },
      { name: '_creatorStake', type: 'uint128' }
    ],
    name: 'createMarket',
    outputs: [{ name: '', type: 'uint32' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: '_marketId', type: 'uint32' },
      { name: '_outcome', type: 'bool' },
      { name: '_amount', type: 'uint128' }
    ],
    name: 'placeBet',
    outputs: [{ name: '', type: 'uint32' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: '_betId', type: 'uint32' }],
    name: 'claimWinnings',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  // Creator functions
  {
    inputs: [{ name: '_marketId', type: 'uint32' }],
    name: 'withdrawCreatorStake',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: '_marketId', type: 'uint32' }],
    name: 'claimCreatorReward',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: '_creator', type: 'address' }],
    name: 'getCreatorInfo',
    outputs: [
      { name: 'totalStaked', type: 'uint128' },
      { name: 'pendingRewards', type: 'uint128' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  // Utility functions
  {
    inputs: [],
    name: 'getBetLimits',
    outputs: [
      { name: 'minBet', type: 'uint128' },
      { name: 'maxBet', type: 'uint128' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getCreatorStakeLimits',
    outputs: [
      { name: 'minStake', type: 'uint128' },
      { name: 'maxStake', type: 'uint128' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: '_marketId', type: 'uint32' }],
    name: 'getMarketWithOdds',
    outputs: [
      { name: 'market', type: 'tuple', components: [
        { name: 'id', type: 'uint32' },
        { name: 'predictionType', type: 'uint8' },
        { name: 'title', type: 'string' },
        { name: 'targetId', type: 'string' },
        { name: 'threshold', type: 'uint32' },
        { name: 'deadline', type: 'uint32' },
        { name: 'yesPool', type: 'uint128' },
        { name: 'noPool', type: 'uint128' },
        { name: 'status', type: 'uint8' },
        { name: 'outcome', type: 'bool' },
        { name: 'creator', type: 'address' },
        { name: 'creatorStake', type: 'uint128' },
        { name: 'totalVolume', type: 'uint128' },
        { name: 'creatorRewarded', type: 'bool' }
      ]},
      { name: 'yesOdds', type: 'uint256' },
      { name: 'noOdds', type: 'uint256' },
      { name: 'creatorStakeUSD', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// Contract address (placeholder - update when deployed)
export const BLINK_CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890' as const;

// USDC contract address on Base
export const USDC_CONTRACT_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;

// Initialize clients
export const publicClient = createPublicClient({
  chain: base,
  transport: http()
});

// Market types enum
export enum PredictionType {
  VIRAL_CAST = 0,
  POLL_OUTCOME = 1,
  CHANNEL_BATTLE = 2,
  CREATOR_MILESTONE = 3
}

export enum MarketStatus {
  ACTIVE = 0,
  SETTLED = 1,
  CANCELLED = 2
}

// Helper functions for contract interaction
export const blinkContract = {
  // Read functions
  async getMarket(marketId: number) {
    try {
      const result = await publicClient.readContract({
        address: BLINK_CONTRACT_ADDRESS,
        abi: BLINK_ABI,
        functionName: 'markets',
        args: [BigInt(marketId)]
      });
      
      return {
        id: Number(result[0]),
        predictionType: result[1] as PredictionType,
        title: result[2],
        targetId: result[3],
        threshold: Number(result[4]),
        deadline: new Date(Number(result[5]) * 1000),
        yesPool: formatEther(result[6]),
        noPool: formatEther(result[7]),
        status: result[8] as MarketStatus,
        creator: result[9],
        createdAt: new Date(Number(result[10]) * 1000)
      };
    } catch (error) {
      console.error('Error fetching market:', error);
      return null;
    }
  },

  async getUserProfile(address: string) {
    try {
      const result = await publicClient.readContract({
        address: BLINK_CONTRACT_ADDRESS,
        abi: BLINK_ABI,
        functionName: 'getUserProfile',
        args: [address as `0x${string}`]
      });
      
      return {
        totalBets: Number(result[0]),
        winStreak: Number(result[1]),
        maxStreak: Number(result[2]),
        communityPoints: Number(result[3]),
        sharesGenerated: Number(result[4]),
        correctPredictions: Number(result[5]),
        following: result[6],
        lastActive: new Date(Number(result[7]) * 1000),
        tier: Number(result[8])
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  },

  async getHotMarkets(limit: number = 10) {
    try {
      const result = await publicClient.readContract({
        address: BLINK_CONTRACT_ADDRESS,
        abi: BLINK_ABI,
        functionName: 'getHotMarkets',
        args: [BigInt(limit)]
      });
      
      return result.map(id => Number(id));
    } catch (error) {
      console.error('Error fetching hot markets:', error);
      return [];
    }
  },

  // Write functions with Base Account support
  async placeBet(walletClient: any, marketId: number, outcome: 0 | 1, amount: string) {
    try {
      const { request } = await publicClient.simulateContract({
        address: BLINK_CONTRACT_ADDRESS,
        abi: BLINK_ABI,
        functionName: 'placeBet',
        args: [BigInt(marketId), BigInt(outcome)],
        value: parseEther(amount),
        account: walletClient?.account
      });
      
      // Try Base Account first
      if (isBaseAccountAvailable()) {
        const calls = [{
          to: request.to,
          data: request.data,
          value: request.value
        }];
        return await sendBaseAccountTransaction(calls);
      }

      // Fallback to EOA wagmi wallet client
      const hash = await walletClient.writeContract(request);
      return hash;
    } catch (error) {
      console.error('Error placing bet:', error);
      throw error;
    }
  },

  async createViralCastMarket(
    walletClient: any, 
    title: string, 
    castHash: string, 
    likesThreshold: number, 
    duration: number
  ) {
    try {
      const { request } = await publicClient.simulateContract({
        address: BLINK_CONTRACT_ADDRESS,
        abi: BLINK_ABI,
        functionName: 'createViralCastMarket',
        args: [title, castHash, BigInt(likesThreshold), BigInt(duration)],
        account: walletClient?.account
      });
      
      // Try Base Account first
      if (isBaseAccountAvailable()) {
        const calls = [{
          to: request.to,
          data: request.data,
          value: request.value
        }];
        return await sendBaseAccountTransaction(calls);
      }

      const hash = await walletClient.writeContract(request);
      return hash;
    } catch (error) {
      console.error('Error creating viral cast market:', error);
      throw error;
    }
  },

  async createPollMarket(
    walletClient: any,
    title: string,
    pollId: string,
    duration: number
  ) {
    try {
      const { request } = await publicClient.simulateContract({
        address: BLINK_CONTRACT_ADDRESS,
        abi: BLINK_ABI,
        functionName: 'createPollMarket',
        args: [title, pollId, BigInt(duration)],
        account: walletClient?.account
      });
      
      // Try Base Account first
      if (isBaseAccountAvailable()) {
        const calls = [{
          to: request.to,
          data: request.data,
          value: request.value
        }];
        return await sendBaseAccountTransaction(calls);
      }

      const hash = await walletClient.writeContract(request);
      return hash;
    } catch (error) {
      console.error('Error creating poll market:', error);
      throw error;
    }
  }
};

// Utility functions
export function calculateOdds(yesPool: string, noPool: string, outcome: 0 | 1): number {
  const yes = parseFloat(yesPool);
  const no = parseFloat(noPool);
  const total = yes + no;
  
  if (total === 0) return 1.0;
  
  if (outcome === 1) {
    // YES odds = total pool / yes pool
    return yes === 0 ? 2.0 : total / yes;
  } else {
    // NO odds = total pool / no pool  
    return no === 0 ? 2.0 : total / no;
  }
}

export function formatTimeRemaining(deadline: Date): string {
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  
  if (diff <= 0) return 'Ended';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
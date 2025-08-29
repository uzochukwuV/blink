import { createPublicClient, http, encodeFunctionData, parseUnits, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { sendBaseAccountTransaction, isBaseAccountAvailable } from './baseAccount';

// Minimal ERC20 ABI for allowance/approve
const ERC20_ABI = [
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
] as const;

// Blink contract ABI (aligned with contracts/Blink.sol)
export const BLINK_ABI = [
  // mappings
  {
    type: 'function',
    name: 'markets',
    stateMutability: 'view',
    inputs: [{ name: '_marketId', type: 'uint256' }],
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
      { name: 'creatorRewarded', type: 'bool' },
    ],
  },
  // reads
  {
    type: 'function',
    name: 'getActiveMarkets',
    stateMutability: 'view',
    inputs: [
      { name: '_type', type: 'uint8' },
      { name: '_limit', type: 'uint32' },
    ],
    outputs: [{
      type: 'tuple[]',
      name: 'markets',
      components: [
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
        { name: 'creatorRewarded', type: 'bool' },
      ],
    }],
  },
  {
    type: 'function',
    name: 'getUserBets',
    stateMutability: 'view',
    inputs: [
      { name: '_user', type: 'address' },
      { name: '_limit', type: 'uint32' },
    ],
    outputs: [{
      type: 'tuple[]',
      components: [
        { name: 'id', type: 'uint32' },
        { name: 'marketId', type: 'uint32' },
        { name: 'bettor', type: 'address' },
        { name: 'outcome', type: 'bool' },
        { name: 'amount', type: 'uint128' },
        { name: 'timestamp', type: 'uint32' },
        { name: 'settled', type: 'bool' },
        { name: 'payout', type: 'uint128' },
      ],
    }],
  },
  {
    type: 'function',
    name: 'getMarketWithOdds',
    stateMutability: 'view',
    inputs: [{ name: '_marketId', type: 'uint32' }],
    outputs: [
      {
        type: 'tuple',
        name: 'market',
        components: [
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
          { name: 'creatorRewarded', type: 'bool' },
        ],
      },
      { name: 'yesOdds', type: 'uint256' },
      { name: 'noOdds', type: 'uint256' },
      { name: 'creatorStakeUSD', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'getBetLimits',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'minBet', type: 'uint128' },
      { name: 'maxBet', type: 'uint128' },
    ],
  },
  {
    type: 'function',
    name: 'getCreatorStakeLimits',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'minStake', type: 'uint128' },
      { name: 'maxStake', type: 'uint128' },
    ],
  },
  // writes
  {
    type: 'function',
    name: 'createMarket',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_type', type: 'uint8' },
      { name: '_title', type: 'string' },
      { name: '_targetId', type: 'string' },
      { name: '_threshold', type: 'uint32' },
      { name: '_duration', type: 'uint32' },
      { name: '_creatorStake', type: 'uint128' },
    ],
    outputs: [{ type: 'uint32' }],
  },
  {
    type: 'function',
    name: 'placeBet',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_marketId', type: 'uint32' },
      { name: '_outcome', type: 'bool' },
      { name: '_amount', type: 'uint128' },
    ],
    outputs: [{ type: 'uint32' }],
  },
  {
    type: 'function',
    name: 'claimWinnings',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_betId', type: 'uint32' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'withdrawCreatorStake',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_marketId', type: 'uint32' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'claimCreatorReward',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_marketId', type: 'uint32' }],
    outputs: [],
  },
] as const;

// Contract address (env configurable)
export const BLINK_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_BLINK_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;

// USDC contract address on Base mainnet
export const USDC_CONTRACT_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;

// Initialize client
export const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

// Enums aligned to contract
export enum PredictionType {
  VIRAL_CAST = 0,
  POLL_OUTCOME = 1,
  CHANNEL_GROWTH = 2,
  CREATOR_MILESTONE = 3,
}

export enum MarketStatus {
  ACTIVE = 0,
  SETTLED = 1,
  CANCELLED = 2,
}

export type Market = {
  id: number;
  predictionType: PredictionType;
  title: string;
  targetId: string;
  threshold: number;
  deadline: number;
  yesPool: bigint;  // 6 decimals
  noPool: bigint;   // 6 decimals
  status: MarketStatus;
  outcome: boolean;
  creator: `0x${string}`;
  creatorStake: bigint; // 6 decimals
  totalVolume: bigint;  // 6 decimals
  creatorRewarded: boolean;
};

export type Bet = {
  id: number;
  marketId: number;
  bettor: `0x${string}`;
  outcome: boolean;
  amount: bigint; // 6 decimals
  timestamp: number;
  settled: boolean;
  payout: bigint; // 6 decimals
};

export const blinkContract = {
  async getActiveMarkets(type: PredictionType, limit: number) {
    const result = await publicClient.readContract({
      address: BLINK_CONTRACT_ADDRESS,
      abi: BLINK_ABI,
      functionName: 'getActiveMarkets',
      args: [type, BigInt(limit)],
    }) as any[];

    return result.map((m) => ({
      id: Number(m.id),
      predictionType: Number(m.predictionType),
      title: m.title,
      targetId: m.targetId,
      threshold: Number(m.threshold),
      deadline: Number(m.deadline),
      yesPool: BigInt(m.yesPool),
      noPool: BigInt(m.noPool),
      status: Number(m.status),
      outcome: Boolean(m.outcome),
      creator: m.creator,
      creatorStake: BigInt(m.creatorStake),
      totalVolume: BigInt(m.totalVolume),
      creatorRewarded: Boolean(m.creatorRewarded),
    })) as Market[];
  },

  async getUserBets(address: `0x${string}`, limit: number) {
    const result = await publicClient.readContract({
      address: BLINK_CONTRACT_ADDRESS,
      abi: BLINK_ABI,
      functionName: 'getUserBets',
      args: [address, BigInt(limit)],
    }) as any[];

    return result.map((b) => ({
      id: Number(b.id),
      marketId: Number(b.marketId),
      bettor: b.bettor,
      outcome: Boolean(b.outcome),
      amount: BigInt(b.amount),
      timestamp: Number(b.timestamp),
      settled: Boolean(b.settled),
      payout: BigInt(b.payout),
    })) as Bet[];
  },

  async getMarketWithOdds(marketId: number) {
    const [market, yesOdds, noOdds, creatorStakeUSD] = await publicClient.readContract({
      address: BLINK_CONTRACT_ADDRESS,
      abi: BLINK_ABI,
      functionName: 'getMarketWithOdds',
      args: [BigInt(marketId)],
    }) as any[];

    const m = market as any;
    const parsed: Market = {
      id: Number(m.id),
      predictionType: Number(m.predictionType),
      title: m.title,
      targetId: m.targetId,
      threshold: Number(m.threshold),
      deadline: Number(m.deadline),
      yesPool: BigInt(m.yesPool),
      noPool: BigInt(m.noPool),
      status: Number(m.status),
      outcome: Boolean(m.outcome),
      creator: m.creator,
      creatorStake: BigInt(m.creatorStake),
      totalVolume: BigInt(m.totalVolume),
      creatorRewarded: Boolean(m.creatorRewarded),
    };

    return {
      market: parsed,
      yesOdds: BigInt(yesOdds),
      noOdds: BigInt(noOdds),
      creatorStakeUSD: BigInt(creatorStakeUSD),
    };
  },

  async getBetLimits() {
    const [minBet, maxBet] = await publicClient.readContract({
      address: BLINK_CONTRACT_ADDRESS,
      abi: BLINK_ABI,
      functionName: 'getBetLimits',
      args: [],
    }) as [bigint, bigint];

    return { minBet, maxBet }; // 6 decimals
  },

  async getCreatorStakeLimits() {
    const [minStake, maxStake] = await publicClient.readContract({
      address: BLINK_CONTRACT_ADDRESS,
      abi: BLINK_ABI,
      functionName: 'getCreatorStakeLimits',
      args: [],
    }) as [bigint, bigint];

    return { minStake, maxStake }; // 6 decimals
  },

  // Client-side write helpers (Base Account aware)
  async placeBet({
    walletClient,
    userAddress,
    marketId,
    outcome,
    usdcAmount, // number in whole USDC (e.g., 12.34)
  }: {
    walletClient?: any;
    userAddress: `0x${string}`;
    marketId: number;
    outcome: boolean;
    usdcAmount: number;
  }) {
    const amount6 = parseUnits(usdcAmount.toString(), 6);

    // Check allowance
    const allowance = await publicClient.readContract({
      address: USDC_CONTRACT_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [userAddress, BLINK_CONTRACT_ADDRESS],
    }) as bigint;

    const calls: Array<{ to: `0x${string}`; data: `0x${string}`; value?: bigint }> = [];

    if (allowance < amount6) {
      const approveData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [BLINK_CONTRACT_ADDRESS, amount6],
      });
      calls.push({ to: USDC_CONTRACT_ADDRESS, data: approveData });
    }

    const placeBetData = encodeFunctionData({
      abi: BLINK_ABI,
      functionName: 'placeBet',
      args: [BigInt(marketId), outcome, amount6],
    });
    calls.push({ to: BLINK_CONTRACT_ADDRESS, data: placeBetData });

    // Prefer Base Account batched call
    if (isBaseAccountAvailable()) {
      return await sendBaseAccountTransaction(calls);
    }

    // Fallback: EOA via wagmi wallet client (sequential)
    if (!walletClient) {
      throw new Error('No Base Account provider or wallet client available');
    }

    if (allowance < amount6) {
      await walletClient.writeContract({
        address: USDC_CONTRACT_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [BLINK_CONTRACT_ADDRESS, amount6],
        account: userAddress,
      });
    }

    const hash = await walletClient.writeContract({
      address: BLINK_CONTRACT_ADDRESS,
      abi: BLINK_ABI,
      functionName: 'placeBet',
      args: [BigInt(marketId), outcome, amount6],
      account: userAddress,
    });

    return hash as string;
  },
};

// Utilities
export function calculateOdds(yesPool6: bigint, noPool6: bigint, outcomeYes: boolean): number {
  const yes = Number(formatUnits(yesPool6, 6));
  const no = Number(formatUnits(noPool6, 6));
  const total = yes + no;
  if (total <= 0) return 2.0;
  if (outcomeYes) {
    return yes <= 0 ? 2.0 : total / yes;
  }
  return no <= 0 ? 2.0 : total / no;
}

export function formatTimeRemaining(deadlineTs: number): string {
  const now = Date.now();
  const diff = deadlineTs * 1000 - now;
  if (diff <= 0) return 'Ended';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
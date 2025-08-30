import { createPublicClient, http, encodeFunctionData, parseUnits, formatUnits } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { sendBaseAccountTransaction, isBaseAccountAvailable } from './baseAccount';

// Minimal ERC20 ABI for allowance/approve
const ERC20_ABI = [
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
] as const;

// Blink contract ABI (aligned with contracts/Blink.sol)
export const BLINK_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_usdc",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_usdcPriceFeed",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "OwnableInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "SafeERC20FailedOperation",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint32",
        "name": "betId",
        "type": "uint32"
      },
      {
        "indexed": true,
        "internalType": "uint32",
        "name": "marketId",
        "type": "uint32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "bettor",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "outcome",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "amount",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "usdValue",
        "type": "uint256"
      }
    ],
    "name": "BetPlaced",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint32",
        "name": "marketId",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "reward",
        "type": "uint128"
      }
    ],
    "name": "CreatorRewardClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "amount",
        "type": "uint128"
      }
    ],
    "name": "CreatorStakeWithdrawn",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint32",
        "name": "marketId",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "enum Blink.PredictionType",
        "name": "predictionType",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "title",
        "type": "string"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "threshold",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "deadline",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "creatorStake",
        "type": "uint128"
      }
    ],
    "name": "MarketCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint32",
        "name": "marketId",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "outcome",
        "type": "bool"
      }
    ],
    "name": "MarketSettled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "int256",
        "name": "newPrice",
        "type": "int256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "PriceFeedUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint32",
        "name": "betId",
        "type": "uint32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "winner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "payout",
        "type": "uint128"
      }
    ],
    "name": "WinningsClaimed",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "CREATOR_REWARD_PERCENTAGE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "DEFAULT_BET_USD",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "HOUSE_EDGE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_BET_USD",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_CREATOR_STAKE_USD",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MIN_BET_USD",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MIN_CREATOR_STAKE_USD",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "PRICE_STALENESS_THRESHOLD",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "USDC",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "activeMarkets",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_oracle",
        "type": "address"
      }
    ],
    "name": "addOracle",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "betCounter",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
      }
    ],
    "name": "bets",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "id",
        "type": "uint32"
      },
      {
        "internalType": "uint32",
        "name": "marketId",
        "type": "uint32"
      },
      {
        "internalType": "address",
        "name": "bettor",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "outcome",
        "type": "bool"
      },
      {
        "internalType": "uint128",
        "name": "amount",
        "type": "uint128"
      },
      {
        "internalType": "uint32",
        "name": "timestamp",
        "type": "uint32"
      },
      {
        "internalType": "bool",
        "name": "settled",
        "type": "bool"
      },
      {
        "internalType": "uint128",
        "name": "payout",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "_marketId",
        "type": "uint32"
      }
    ],
    "name": "cancelMarket",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "_marketId",
        "type": "uint32"
      }
    ],
    "name": "claimCreatorReward",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "_betId",
        "type": "uint32"
      }
    ],
    "name": "claimWinnings",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint128",
        "name": "_usdcAmount",
        "type": "uint128"
      }
    ],
    "name": "convertUSDCToUSD",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "usdValue",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum Blink.PredictionType",
        "name": "_type",
        "type": "uint8"
      },
      {
        "internalType": "string",
        "name": "_title",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_targetId",
        "type": "string"
      },
      {
        "internalType": "uint32",
        "name": "_threshold",
        "type": "uint32"
      },
      {
        "internalType": "uint32",
        "name": "_duration",
        "type": "uint32"
      },
      {
        "internalType": "uint128",
        "name": "_creatorStake",
        "type": "uint128"
      }
    ],
    "name": "createMarket",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "creatorRewards",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "creatorStakes",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum Blink.PredictionType",
        "name": "_type",
        "type": "uint8"
      },
      {
        "internalType": "uint32",
        "name": "_limit",
        "type": "uint32"
      }
    ],
    "name": "getActiveMarkets",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint32",
            "name": "id",
            "type": "uint32"
          },
          {
            "internalType": "enum Blink.PredictionType",
            "name": "predictionType",
            "type": "uint8"
          },
          {
            "internalType": "string",
            "name": "title",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "targetId",
            "type": "string"
          },
          {
            "internalType": "uint32",
            "name": "threshold",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "deadline",
            "type": "uint32"
          },
          {
            "internalType": "uint128",
            "name": "yesPool",
            "type": "uint128"
          },
          {
            "internalType": "uint128",
            "name": "noPool",
            "type": "uint128"
          },
          {
            "internalType": "enum Blink.MarketStatus",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "bool",
            "name": "outcome",
            "type": "bool"
          },
          {
            "internalType": "address",
            "name": "creator",
            "type": "address"
          },
          {
            "internalType": "uint128",
            "name": "creatorStake",
            "type": "uint128"
          },
          {
            "internalType": "uint128",
            "name": "totalVolume",
            "type": "uint128"
          },
          {
            "internalType": "bool",
            "name": "creatorRewarded",
            "type": "bool"
          }
        ],
        "internalType": "struct Blink.Market[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBetLimits",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "minBet",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "maxBet",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_creator",
        "type": "address"
      }
    ],
    "name": "getCreatorInfo",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "totalStaked",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "pendingRewards",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getCreatorStakeLimits",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "minStake",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "maxStake",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDefaultBetAmount",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "defaultBet",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "_marketId",
        "type": "uint32"
      }
    ],
    "name": "getMarketWithOdds",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint32",
            "name": "id",
            "type": "uint32"
          },
          {
            "internalType": "enum Blink.PredictionType",
            "name": "predictionType",
            "type": "uint8"
          },
          {
            "internalType": "string",
            "name": "title",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "targetId",
            "type": "string"
          },
          {
            "internalType": "uint32",
            "name": "threshold",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "deadline",
            "type": "uint32"
          },
          {
            "internalType": "uint128",
            "name": "yesPool",
            "type": "uint128"
          },
          {
            "internalType": "uint128",
            "name": "noPool",
            "type": "uint128"
          },
          {
            "internalType": "enum Blink.MarketStatus",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "bool",
            "name": "outcome",
            "type": "bool"
          },
          {
            "internalType": "address",
            "name": "creator",
            "type": "address"
          },
          {
            "internalType": "uint128",
            "name": "creatorStake",
            "type": "uint128"
          },
          {
            "internalType": "uint128",
            "name": "totalVolume",
            "type": "uint128"
          },
          {
            "internalType": "bool",
            "name": "creatorRewarded",
            "type": "bool"
          }
        ],
        "internalType": "struct Blink.Market",
        "name": "market",
        "type": "tuple"
      },
      {
        "internalType": "uint256",
        "name": "yesOdds",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "noOdds",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "creatorStakeUSD",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getUSDCPrice",
    "outputs": [
      {
        "internalType": "int256",
        "name": "price",
        "type": "int256"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_user",
        "type": "address"
      },
      {
        "internalType": "uint32",
        "name": "_limit",
        "type": "uint32"
      }
    ],
    "name": "getUserBets",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint32",
            "name": "id",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "marketId",
            "type": "uint32"
          },
          {
            "internalType": "address",
            "name": "bettor",
            "type": "address"
          },
          {
            "internalType": "bool",
            "name": "outcome",
            "type": "bool"
          },
          {
            "internalType": "uint128",
            "name": "amount",
            "type": "uint128"
          },
          {
            "internalType": "uint32",
            "name": "timestamp",
            "type": "uint32"
          },
          {
            "internalType": "bool",
            "name": "settled",
            "type": "bool"
          },
          {
            "internalType": "uint128",
            "name": "payout",
            "type": "uint128"
          }
        ],
        "internalType": "struct Blink.Bet[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_user",
        "type": "address"
      }
    ],
    "name": "getUserStats",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint32",
            "name": "totalBets",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "wins",
            "type": "uint32"
          },
          {
            "internalType": "uint32",
            "name": "losses",
            "type": "uint32"
          },
          {
            "internalType": "uint128",
            "name": "totalVolume",
            "type": "uint128"
          },
          {
            "internalType": "uint128",
            "name": "totalWinnings",
            "type": "uint128"
          }
        ],
        "internalType": "struct Blink.UserStats",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "houseTreasury",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "marketCounter",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
      }
    ],
    "name": "markets",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "id",
        "type": "uint32"
      },
      {
        "internalType": "enum Blink.PredictionType",
        "name": "predictionType",
        "type": "uint8"
      },
      {
        "internalType": "string",
        "name": "title",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "targetId",
        "type": "string"
      },
      {
        "internalType": "uint32",
        "name": "threshold",
        "type": "uint32"
      },
      {
        "internalType": "uint32",
        "name": "deadline",
        "type": "uint32"
      },
      {
        "internalType": "uint128",
        "name": "yesPool",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "noPool",
        "type": "uint128"
      },
      {
        "internalType": "enum Blink.MarketStatus",
        "name": "status",
        "type": "uint8"
      },
      {
        "internalType": "bool",
        "name": "outcome",
        "type": "bool"
      },
      {
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "internalType": "uint128",
        "name": "creatorStake",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "totalVolume",
        "type": "uint128"
      },
      {
        "internalType": "bool",
        "name": "creatorRewarded",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum Blink.PredictionType",
        "name": "",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "marketsByType",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "oracles",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "_marketId",
        "type": "uint32"
      },
      {
        "internalType": "bool",
        "name": "_outcome",
        "type": "bool"
      },
      {
        "internalType": "uint128",
        "name": "_amount",
        "type": "uint128"
      }
    ],
    "name": "placeBet",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_oracle",
        "type": "address"
      }
    ],
    "name": "removeOracle",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "_marketId",
        "type": "uint32"
      },
      {
        "internalType": "bool",
        "name": "_outcome",
        "type": "bool"
      }
    ],
    "name": "settleMarket",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalVolume",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "usdcPriceFeed",
    "outputs": [
      {
        "internalType": "contract AggregatorV3Interface",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "userBets",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "userMarkets",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "userStats",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "totalBets",
        "type": "uint32"
      },
      {
        "internalType": "uint32",
        "name": "wins",
        "type": "uint32"
      },
      {
        "internalType": "uint32",
        "name": "losses",
        "type": "uint32"
      },
      {
        "internalType": "uint128",
        "name": "totalVolume",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "totalWinnings",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "_marketId",
        "type": "uint32"
      }
    ],
    "name": "withdrawCreatorStake",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdrawHouseFees",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// Contract address (env configurable)
export const BLINK_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_BLINK_CONTRACT_ADDRESS || '0x606F69716C6e4d77759fB85af7d13BC35b210a7f') as `0x${string}`;

// USDC contract address on Base mainnet
export const USDC_CONTRACT_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;

// Initialize client
export const publicClient = createPublicClient({
  chain: baseSepolia,
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

  async createMarket({
    walletClient,
    userAddress,
    type,
    title,
    targetId,
    threshold,
    durationHours,
    creatorStakeUSDC,
  }: {
    walletClient?: any;
    userAddress: `0x${string}`;
    type: PredictionType;
    title: string;
    targetId: string;
    threshold: number;
    durationHours: number;
    creatorStakeUSDC: number;
  }) {
    const stake6 = parseUnits(creatorStakeUSDC.toString(), 6);

    // Check allowance
    const allowance = await publicClient.readContract({
      address: USDC_CONTRACT_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [userAddress, BLINK_CONTRACT_ADDRESS],
    }) as bigint;

    const calls: Array<{ to: `0x${string}`; data: `0x${string}`; value?: bigint }> = [];
    if (allowance < stake6) {
      const approveData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [BLINK_CONTRACT_ADDRESS, stake6],
      });
      calls.push({ to: USDC_CONTRACT_ADDRESS, data: approveData });
    }

    const createData = encodeFunctionData({
      abi: BLINK_ABI,
      functionName: 'createMarket',
      args: [type, title, targetId, BigInt(threshold), BigInt(durationHours), stake6],
    });
    calls.push({ to: BLINK_CONTRACT_ADDRESS, data: createData });

    if (isBaseAccountAvailable()) {
      return await sendBaseAccountTransaction(calls);
    }

    if (!walletClient) {
      throw new Error('No Base Account provider or wallet client available');
    }

    if (allowance < stake6) {
      await walletClient.writeContract({
        address: USDC_CONTRACT_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [BLINK_CONTRACT_ADDRESS, stake6],
        account: userAddress,
      });
    }

    const hash = await walletClient.writeContract({
      address: BLINK_CONTRACT_ADDRESS,
      abi: BLINK_ABI,
      functionName: 'createMarket',
      args: [type, title, targetId, BigInt(threshold), BigInt(durationHours), stake6],
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
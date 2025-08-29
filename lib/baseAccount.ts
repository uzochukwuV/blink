import { createBaseAccountSDK } from '@base-org/account';
import { createPublicClient, http, verifyMessage } from 'viem';
import { base } from 'viem/chains';
import { APP_NAME } from './constants';

// Initialize Base Account SDK
export const baseAccountSDK = createBaseAccountSDK({
  appName: APP_NAME,
  appChainIds: [base.id],
});

// Public client for signature verification
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

// Nonce management (in production, use Redis or database)
const nonces = new Set<string>();

export interface AuthResult {
  address: string;
  message: string;
  signature: string;
  success: boolean;
  error?: string;
}

export interface BaseAccountProvider {
  request: (params: any) => Promise<any>;
}

/**
 * Generate a fresh nonce for authentication
 */
export function generateNonce(): string {
  const nonce = crypto.randomUUID().replace(/-/g, '');
  nonces.add(nonce);
  return nonce;
}

/**
 * Authenticate user with Base Account
 */
export async function authenticateWithBaseAccount(): Promise<AuthResult> {
  try {
    const provider = baseAccountSDK.getProvider();
    const nonce = generateNonce();

    // Connect and authenticate
    const { accounts } = await provider.request({
      method: 'wallet_connect',
      params: [{
        version: '1',
        capabilities: {
          signInWithEthereum: {
            nonce,
            chainId: `0x${base.id.toString(16)}` // Base Mainnet
          }
        }
      }]
    });

    const { address } = accounts[0];
    const { message, signature } = accounts[0].capabilities.signInWithEthereum;

    return {
      address,
      message,
      signature,
      success: true
    };
  } catch (error) {
    console.error('Base Account authentication error:', error);
    return {
      address: '',
      message: '',
      signature: '',
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed'
    };
  }
}

/**
 * Verify authentication signature
 */
export async function verifyAuthSignature(
  address: string,
  message: string,
  signature: string
): Promise<boolean> {
  try {
    // Check if nonce has been used
    const nonce = message.match(/at (\w{32})$/)?.[1];
    if (!nonce || !nonces.delete(nonce)) {
      console.error('Invalid or reused nonce');
      return false;
    }

    // Verify signature
    const valid = await publicClient.verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`
    });

    return valid;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Get Base Account provider for smart contract interactions
 */
export function getBaseAccountProvider(): BaseAccountProvider | null {
  try {
    return baseAccountSDK.getProvider();
  } catch {
    return null;
  }
}

/**
 * Send transaction using Base Account
 */
export async function sendBaseAccountTransaction(
  calls: Array<{
    to: `0x${string}`;
    data: `0x${string}`;
    value?: bigint;
  }>
): Promise<string> {
  const provider = getBaseAccountProvider();
  if (!provider) {
    throw new Error('Base Account provider not available');
  }

  const response = await provider.request({
    method: 'wallet_sendCalls',
    params: [{
      version: '1',
      chainId: `0x${base.id.toString(16)}`,
      calls
    }]
  });

  return response?.transactionHash || response;
}

/**
 * Check if Base Account is available
 */
export function isBaseAccountAvailable(): boolean {
  return typeof window !== 'undefined' && !!getBaseAccountProvider();
}

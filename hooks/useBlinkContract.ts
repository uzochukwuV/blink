import { useState, useEffect } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { blinkContract, calculateOdds, formatTimeRemaining } from '~/lib/contracts';

export function useBlinkContract() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Market operations
  const getMarket = async (marketId: number) => {
    setLoading(true);
    setError(null);
    try {
      const market = await blinkContract.getMarket(marketId);
      return market;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch market');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getUserProfile = async (userAddress?: string) => {
    if (!userAddress && !address) return null;
    
    setLoading(true);
    setError(null);
    try {
      const profile = await blinkContract.getUserProfile(userAddress || address!);
      return profile;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user profile');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getHotMarkets = async (limit: number = 10) => {
    setLoading(true);
    setError(null);
    try {
      const marketIds = await blinkContract.getHotMarkets(limit);
      // Fetch full market data for each ID
      const markets = await Promise.all(
        marketIds.map(id => blinkContract.getMarket(id))
      );
      return markets.filter(market => market !== null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch hot markets');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const placeBet = async (marketId: number, outcome: 0 | 1, amount: string) => {
    if (!walletClient || !isConnected) {
      setError('Wallet not connected');
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const hash = await blinkContract.placeBet(walletClient, marketId, outcome, amount);
      return hash;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place bet');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createViralCastMarket = async (
    title: string,
    castHash: string,
    likesThreshold: number,
    duration: number
  ) => {
    if (!walletClient || !isConnected) {
      setError('Wallet not connected');
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const hash = await blinkContract.createViralCastMarket(
        walletClient,
        title,
        castHash,
        likesThreshold,
        duration
      );
      return hash;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create market');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createPollMarket = async (title: string, pollId: string, duration: number) => {
    if (!walletClient || !isConnected) {
      setError('Wallet not connected');
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const hash = await blinkContract.createPollMarket(walletClient, title, pollId, duration);
      return hash;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create poll market');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    // State
    loading,
    error,
    isConnected,
    address,
    
    // Market operations
    getMarket,
    getUserProfile,
    getHotMarkets,
    placeBet,
    createViralCastMarket,
    createPollMarket,
    
    // Utility functions
    calculateOdds,
    formatTimeRemaining,
  };
}

// Hook for real-time market data
export function useMarket(marketId: number) {
  const [market, setMarket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getMarket } = useBlinkContract();

  useEffect(() => {
    if (marketId) {
      getMarket(marketId).then(data => {
        setMarket(data);
        setLoading(false);
      }).catch(err => {
        setError(err.message);
        setLoading(false);
      });
    }
  }, [marketId]);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await getMarket(marketId);
      setMarket(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh market');
    } finally {
      setLoading(false);
    }
  };

  return { market, loading, error, refresh };
}

// Hook for user profile data
export function useUserProfile(userAddress?: string) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getUserProfile, address } = useBlinkContract();

  useEffect(() => {
    const targetAddress = userAddress || address;
    if (targetAddress) {
      getUserProfile(targetAddress).then(data => {
        setProfile(data);
        setLoading(false);
      }).catch(err => {
        setError(err.message);
        setLoading(false);
      });
    }
  }, [userAddress, address]);

  const refresh = async () => {
    const targetAddress = userAddress || address;
    if (!targetAddress) return;
    
    setLoading(true);
    try {
      const data = await getUserProfile(targetAddress);
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh profile');
    } finally {
      setLoading(false);
    }
  };

  return { profile, loading, error, refresh };
}
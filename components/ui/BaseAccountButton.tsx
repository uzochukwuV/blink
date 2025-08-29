import React, { useState } from 'react';
import { authenticateWithBaseAccount } from '~/lib/baseAccount';
import { PillButton } from './PillButton';

interface BaseAccountButtonProps {
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export function BaseAccountButton({ 
  onSuccess, 
  onError, 
  className = "",
  children = "Sign in with Base"
}: BaseAccountButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const result = await authenticateWithBaseAccount();
      
      if (result.success) {
        // Send to backend for verification
        const response = await fetch('/api/auth/base-account', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address: result.address,
            message: result.message,
            signature: result.signature,
          }),
        });

        const authResult = await response.json();
        
        if (authResult.success) {
          onSuccess?.(authResult);
        } else {
          onError?.(authResult.error || 'Authentication failed');
        }
      } else {
        onError?.(result.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Base Account sign in error:', error);
      onError?.(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PillButton
      onClick={handleSignIn}
      disabled={loading}
      className={`bg-blue-600 hover:bg-blue-700 text-white ${className}`}
    >
      {loading ? 'Connecting...' : children}
    </PillButton>
  );
}

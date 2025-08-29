import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthSignature } from '~/lib/baseAccount';

export async function POST(request: NextRequest) {
  try {
    const { address, message, signature } = await request.json();

    if (!address || !message || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields: address, message, signature' },
        { status: 400 }
      );
    }

    // Verify the signature
    const isValid = await verifyAuthSignature(address, message, signature);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Create session or JWT here
    // For now, return success with user info
    return NextResponse.json({
      success: true,
      user: {
        address,
        authenticated: true
      }
    });

  } catch (error) {
    console.error('Base Account auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

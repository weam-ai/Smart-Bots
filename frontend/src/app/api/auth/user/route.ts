import { NextResponse } from 'next/server';
import { getUserContext } from '@/lib/session';

// Add this export to force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const userContext = await getUserContext();
    
    if (!userContext) {
      // Return 401 Unauthorized instead of 500 for missing session
      return NextResponse.json({
        success: false,
        error: 'No valid session found'
      }, { status: 401 });
    }
    
    return NextResponse.json({
      success: true,
      data: userContext
    });
    
  } catch (error) {
    console.error('❌ Failed to get user context:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

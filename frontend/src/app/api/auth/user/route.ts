import { NextResponse } from 'next/server';
import { getUserContext } from '@/lib/session';

// Add this export to force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('🔍 Getting user context from Iron Session...');
    
    const userContext = await getUserContext();
    
    if (!userContext) {
      return NextResponse.json({
        success: false,
        error: 'Failed to get user context'
      }, { status: 500 });
    }

    console.log('✅ User context from Iron Session:', userContext);
    
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

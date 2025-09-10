import { NextResponse } from 'next/server';
import { envConfig } from '@/config/env';

// Add this export to force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('🔧 Generating widget configuration...');
    
    const backendUrl = 'https://dev.weam.ai/ai-chatbot-api'
    console.log("🚀 ~ GET ~ backendUrl:", backendUrl)
    
    const config = {
      API_BASE_URL: `${backendUrl}`,
      WIDGET_VERSION: '1.0.0',
      // Add any other dynamic configuration here
      NODE_ENV: envConfig.NEXT_PUBLIC_NODE_ENV,
    };

    console.log('✅ Widget configuration generated:', config);
    
    return NextResponse.json(config);
  } catch (error) {
    console.error('❌ Error generating widget config:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate widget configuration',
        fallback: {
          API_BASE_URL: 'https://dev.weam.ai/ai-chatbot-api',
          WIDGET_VERSION: '1.0.0'
        }
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { envConfig } from '@/config/env';

// Add this export to force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const backendUrl =  envConfig.NEXT_PUBLIC_BACKEND_API_URL
    
    const config = {
      API_BASE_URL: `${backendUrl}`,
      WIDGET_VERSION: '1.0.0',
      // Add any other dynamic configuration here
      NODE_ENV: envConfig.NEXT_PUBLIC_NODE_ENV,
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error('❌ Error generating widget config:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate widget configuration',
        fallback: {
          API_BASE_URL: 'http://localhost:5000/ai-chatbot-api',
          WIDGET_VERSION: '1.0.0'
        }
      },
      { status: 500 }
    );
  }
}

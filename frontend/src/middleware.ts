import { NextRequest, NextResponse } from 'next/server';
import { AccessCheckResponse, AccessCheckRequest } from '@/types/solution';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';


console.log("🔥 MIDDLEWARE LOADED!");

// Environment variables for middleware (Edge Runtime compatible)
const NEXT_PUBLIC_BACKEND_API_URL_WITHOUT_PREFIX = process.env.NEXT_PUBLIC_BACKEND_API_URL_WITHOUT_PREFIX || '';
const NEXT_PUBLIC_BASIC_AUTH_USERNAME = process.env.NEXT_PUBLIC_BASIC_AUTH_USERNAME || '';
const NEXT_PUBLIC_BASIC_AUTH_PASSWORD = process.env.NEXT_PUBLIC_BASIC_AUTH_PASSWORD || '';
const NEXT_PUBLIC_SOLUTION_URL = process.env.NEXT_PUBLIC_SOLUTION_URL || '';
const NEXT_PUBLIC_IRON_SESSION_COOKIE_NAME = process.env.NEXT_PUBLIC_IRON_SESSION_COOKIE_NAME || 'weam';
const NEXT_PUBLIC_IRON_SESSION_PASSWORD = process.env.NEXT_PUBLIC_IRON_SESSION_PASSWORD || '';

// Solution apps configuration
const SOLUTION_URL = NEXT_PUBLIC_SOLUTION_URL.split(',');
console.log("🚀 ~ SOLUTION_URL:", SOLUTION_URL)

/**
 * Check if the current path matches any solution app path
 */
function isSolutionAppPath(pathname: string): boolean {
    return SOLUTION_URL.some(app => pathname.startsWith(app));
}

/**
 * Get user session from cookies (Edge Runtime compatible)
 */
async function getSessionFromCookies(request: NextRequest) {
    try {
        // Get session cookie
        const session = await getIronSession(cookies(), {
            cookieName: NEXT_PUBLIC_IRON_SESSION_COOKIE_NAME,
            password: NEXT_PUBLIC_IRON_SESSION_PASSWORD,
            cookieOptions: {
              httpOnly: true,
              secure: process.env.NEXT_PUBLIC_NODE_ENV === 'production',
            },
          });
  return session;
        
    } catch (error) {
        console.error('❌ Error getting session:', error);
        return null;
    }
}

/**
 * Call the access check API
 */
async function checkSolutionAccess(userId: string, urlPath: string, roleCode: string, companyId: string): Promise<AccessCheckResponse> {
    try {
        console.log(`🔍 Checking access for userId: ${userId}, urlPath: ${urlPath}, roleCode: ${roleCode}`);
        
        if (!roleCode) {
            console.warn('⚠️ No role code found in session');
            return { status: 'error', data: { hasAccess: false, message: 'No role code found' }, code: '500', message: 'No role code found' };
        }

        if (!NEXT_PUBLIC_BACKEND_API_URL_WITHOUT_PREFIX) {
            console.error('❌ Backend API URL not configured');
            return { status: 'error', data: { hasAccess: false, message: 'Backend API URL not configured' }, code: '500', message: 'Backend API URL not configured' };
        }

        const requestBody: AccessCheckRequest = {
            "userId": userId,
            "urlPath": urlPath,
            "companyId": companyId
        };
        console.log("🔍 Access check request body:", requestBody);

        const basicauth = Buffer.from(
            `${NEXT_PUBLIC_BASIC_AUTH_USERNAME}:${NEXT_PUBLIC_BASIC_AUTH_PASSWORD}`
        ).toString("base64");

        console.log(`🌐 Calling API: ${NEXT_PUBLIC_BACKEND_API_URL_WITHOUT_PREFIX}/napi/v1/common/check-access-solution`);

        const response = await fetch(`${NEXT_PUBLIC_BACKEND_API_URL_WITHOUT_PREFIX}/napi/v1/common/check-access-solution`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                "Authorization": `Basic ${basicauth}`,
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();
        console.log("🔍 Access check API response:", data);
        return data;
    } catch (error) {
        console.error('❌ Error calling access check API:', error);
        return { status: 'error', data: { hasAccess: false, message: 'API call error' }, code: '500', message: 'API call error' };
    }
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip middleware for certain paths
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/static') ||
        pathname.startsWith('/favicon.ico') ||
        pathname.startsWith('/login')
    ) {
        return NextResponse.next();
    }

    // Get the full path from the URL (including basePath)
    const fullUrl = new URL(request.url);
    const fullPath = fullUrl.pathname; // This will be /ai-chatbot/ or /ai-chatbot

    // For basePath configuration, we need to check if this is the root path or a solution path
    // The pathname will be '/' for the root when basePath is configured
    const isSolutionPath = isSolutionAppPath(fullPath); // Use fullPath instead of pathname
    
    // If it's the root path (/) with basePath, treat it as the base solution path
    if (!isSolutionPath) {
        console.log(`✅ Non-solution path, allowing: ${fullPath}`);
        return NextResponse.next();
    }

    try {
        
        // Get user session
        const session:any= await getSessionFromCookies(request);

        if (!session || !session.user) {
            console.log("🚀 ~ middleware ~ session:", session)
            console.log("🚀 ~ middleware ~ session.user:", session.user)
            console.warn('⚠️ No valid session found, redirecting to login');
            return NextResponse.redirect(new URL('/ai-chatbot/login', request.url));
        }

        console.log(`👤 User session found:`, session.user);

        // Check access to the solution
        if(session.user.roleCode != "USER") {
            console.log(`✅ Admin user, allowing: ${fullPath}`);
            return NextResponse.next();
        }
        const accessResult = await checkSolutionAccess(session.user._id, fullPath, session.user.roleCode || '', session.user.companyId || '');

        if (!accessResult.data.hasAccess) {
            console.warn(`⚠️ Access denied for solution: ${pathname}, message: ${accessResult.message}`);
            return NextResponse.redirect(new URL('/login', request.url));
        }

        console.log(`✅ Access granted for solution: ${pathname}`);
        return NextResponse.next();

    } catch (error) {
        console.error('❌ Middleware error:', error);
        return NextResponse.redirect(new URL('/login', request.url));
    }
}

// Configure which paths the middleware should run on
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - login (login page)
         * Include root path for basePath configuration
         */
        '/',
        '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
    ],
};
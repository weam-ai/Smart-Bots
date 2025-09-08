import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { IRON_SESSION_COOKIE_NAME, IRON_SESSION_PASSWORD, NODE_ENV } from '@/config/env';

// Iron Session configuration (matching your main app)
const ironOptions = {
  cookieName: IRON_SESSION_COOKIE_NAME,
  password: IRON_SESSION_PASSWORD,
  cookieOptions: {
    httpOnly: true,
    secure: NODE_ENV === 'production',
  },
};

// Define the session data interface
export interface IronSessionData {
  user?: {
    _id?: string;
    email?: string;
    companyId?: string;
    roleCode?: string;
    access_token?: string;
    refresh_token?: string;
    isProfileUpdated?: boolean;
    [key: string]: any;
  };
  // Also support direct properties for backward compatibility
  _id?: string;
  email?: string;
  companyId?: string;
  roleCode?: string;
  [key: string]: any;
}

/**
 * Get Iron Session data (server-side only)
 */
export async function getSession(): Promise<IronSession<IronSessionData>> {
  const session = await getIronSession(cookies(), ironOptions);
  return session;
}

/**
 * Get user context from Iron Session (server-side only)
 */
export async function getUserContext(): Promise<{
  userId: string;
  email: string;
  companyId: string;
  roleCode?: string;
} | null> {
  try {
    const session = await getSession();
    console.log("🚀 ~ getUserContext ~ session:", session)
    
    // Check if session has user data (nested under 'user' property)
    const userData = session.user || session;
    
    if (!userData || !userData._id || !userData.email || !userData.companyId) {
      console.warn('⚠️ No valid session found');
      return null;
    }

    return {
      userId: userData._id,  // Map _id to userId
      email: userData.email,
      companyId: userData.companyId,
      roleCode: userData.roleCode || 'user'
    };
  } catch (error) {
    console.error('❌ Failed to get user context from session:', error);
    return null;
  }
}

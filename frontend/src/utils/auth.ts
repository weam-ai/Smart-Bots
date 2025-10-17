import { NEXT_PUBLIC_API_PREFIX } from "@/config/env";

// User context interface
export interface UserContext {
  userId: string;
  email: string;
  companyId: string;
  roleCode?: string;
}

/**
 * Get user context from Iron Session via API route
 */
export const getUserContext = async (): Promise<UserContext | null> => {
  try {
    // Call the API route to get user context
    const response = await fetch(`${NEXT_PUBLIC_API_PREFIX}/api/auth/user`, {
      method: 'GET',
      credentials: 'include', // Include cookies
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.warn('⚠️ No valid session found - user not authenticated');
        return null;
      }
      console.warn('⚠️ Failed to fetch user context from API');
      return null;
    }

    const result = await response.json();
    
    if (!result.success || !result.data) {
      console.warn('⚠️ Invalid response from user context API');
      return null;
    }

    const userContext: UserContext = {
      userId: result.data.userId,
      email: result.data.email,
      companyId: result.data.companyId,
      roleCode: result.data.roleCode
    };

    return userContext;
  } catch (error) {
    console.error('❌ Failed to get user context:', error);
    return null;
  }
};

/**
 * Generate JWT token for API calls
 * Note: In production, this should be done by your main app's backend
 */
export const generateJWTToken = async (): Promise<string | null> => {
  try {
    const userContext = await getUserContext();
    if (!userContext) {
      console.warn('⚠️ No user context available from Iron Session');
      return null;
    }

    // For now, we'll create a simple token structure
    // In production, your main app should generate the JWT token
    const tokenPayload = {
      userId: userContext.userId,
      email: userContext.email,
      companyId: userContext.companyId,
      roleCode: userContext.roleCode,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    // For testing, we'll use a simple base64 token
    // In production, your main app should generate proper JWT tokens
    const token = btoa(JSON.stringify(tokenPayload));
    return token;
  } catch (error) {
    console.error('❌ Failed to generate JWT token:', error);
    return null;
  }
};

/**
 * Get authorization headers for API calls
 */
export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const token = await generateJWTToken();
  if (!token) {
    throw new Error('No valid authentication token available');
  }

  return {
    'Authorization': `Bearer ${token}`
    // Note: Content-Type is not included here to avoid overriding multipart/form-data for uploads
  };
};

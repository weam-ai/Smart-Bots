/**
 * Solution App Configuration
 */
export interface SolutionApp {
  name: string;
  description: string;
  icon: string;
  category: string;
  isActive: boolean;
  pathToOpen: string;
  sequence: number;
}

/**
 * Access Check API Response
 */
export interface AccessCheckResponse {
  status: string;
  data: {
    hasAccess: boolean;
    message?: string;
  };
  code: string;
  message: string;
}


/**
 * Access Check API Request
 */
export interface AccessCheckRequest {
  userId: string;
  urlPath: string;
  companyId: string;
}

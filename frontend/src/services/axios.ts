/**
 * Centralized Axios Configuration
 * Functional HTTP client with interceptors and error handling
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios'
import toast from 'react-hot-toast'
import { HTTP_STATUS, ERROR_MESSAGES, HEADERS, STORAGE_KEYS } from '@/utils/constants'
import { getAuthHeaders } from '@/utils/auth'
import type { ApiResponse } from '@/types/api'
import {  NEXT_PUBLIC_API_TIMEOUT, NEXT_PUBLIC_BACKEND_API_URL, NEXT_PUBLIC_NODE_ENV } from '@/config/env'
console.log("🚀 ~ NEXT_PUBLIC_BACKEND_API_URL: in axios", NEXT_PUBLIC_BACKEND_API_URL)

// Authentication state
let authToken: string | null = null

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: NEXT_PUBLIC_BACKEND_API_URL,
  timeout: NEXT_PUBLIC_API_TIMEOUT,
  withCredentials: true,
})

// ==================== UTILITY FUNCTIONS ====================

/**
 * Generate unique request ID for tracking
 */
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Load auth token from localStorage
 */
const loadAuthToken = (): void => {
  if (typeof window !== 'undefined') {
    authToken = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
  }
}

/**
 * Handle authentication errors
 */
const handleAuthError = (): void => {
  clearAuthToken()
  // Redirect to login page if needed
  if (typeof window !== 'undefined') {
    // window.location.href = '/login'
  }
}

/**
 * Handle specific HTTP error status codes
 */
const handleHttpError = (status: number, errorData?: ApiResponse, url?: string): void => {
  const errorMessage = errorData?.error?.message
  
  // Determine context-specific error message based on URL
  const getContextualError = (defaultMessage: string): string => {
    if (!url) return defaultMessage
    
    if (url.includes('/upload')) {
      return errorMessage || ERROR_MESSAGES.UPLOAD_ERROR
    } else if (url.includes('/agents')) {
      return errorMessage || ERROR_MESSAGES.AGENT_ERROR
    } else if (url.includes('/chat')) {
      return errorMessage || ERROR_MESSAGES.CHAT_ERROR
    }
    
    return errorMessage || defaultMessage
  }

  switch (status) {
    case HTTP_STATUS.BAD_REQUEST:
      toast.error(getContextualError(ERROR_MESSAGES.VALIDATION_ERROR))
      break

    case HTTP_STATUS.UNAUTHORIZED:
      toast.error(getContextualError(ERROR_MESSAGES.AUTH_REQUIRED))
      handleAuthError()
      break

    case HTTP_STATUS.FORBIDDEN:
      toast.error(getContextualError(ERROR_MESSAGES.ACCESS_DENIED))
      break

    case HTTP_STATUS.NOT_FOUND:
      toast.error(getContextualError(ERROR_MESSAGES.NOT_FOUND))
      break

    case HTTP_STATUS.UNPROCESSABLE_ENTITY:
      toast.error(getContextualError(ERROR_MESSAGES.VALIDATION_ERROR))
      break

    case HTTP_STATUS.TOO_MANY_REQUESTS:
      toast.error(getContextualError(ERROR_MESSAGES.RATE_LIMITED))
      break

    case HTTP_STATUS.INTERNAL_SERVER_ERROR:
      toast.error(getContextualError(ERROR_MESSAGES.SERVER_ERROR))
      break

    case HTTP_STATUS.SERVICE_UNAVAILABLE:
      toast.error(getContextualError(ERROR_MESSAGES.SERVICE_UNAVAILABLE))
      break

    default:
      toast.error(getContextualError(ERROR_MESSAGES.UNEXPECTED_ERROR))
  }
}

/**
 * Handle outgoing requests
 */
const handleRequest = async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
  try {
    // Get JWT auth headers
    const authHeaders = await getAuthHeaders()
    
    // Add auth headers
    config.headers = config.headers || {}
    Object.assign(config.headers, authHeaders)

    // Set default Content-Type for non-upload requests
    if (!config.headers['Content-Type'] && !(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json'
    }

    // Add request ID for tracking
    config.headers[HEADERS.X_REQUEST_ID] = generateRequestId()

    return config
  } catch (error) {
    console.error('❌ Failed to add auth headers:', error)
    // Continue without auth headers (will result in 401)
    config.headers = config.headers || {}
    config.headers[HEADERS.X_REQUEST_ID] = generateRequestId()
    
    // Set default Content-Type for non-upload requests
    if (!config.headers['Content-Type'] && !(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json'
    }
    
    return config
  }
}

/**
 * Handle request errors
 */
const handleRequestError = (error: any): Promise<never> => {
  console.error('❌ Request interceptor error:', error)
  return Promise.reject(error)
}

/**
 * Handle incoming responses
 */
const handleResponse = (response: AxiosResponse): AxiosResponse => {
  // Log successful response in development
  if (NEXT_PUBLIC_NODE_ENV === 'development') {
    // Development logging removed for cleaner production code
  }

  // Show success toast for certain operations
  const url = response.config?.url || ''
  const method = response.config?.method?.toUpperCase() || ''
  
  // Only show success toasts for specific operations to avoid spam
  if (method === 'POST' && url.includes('/agents')) {
    // toast.success('Agent created successfully!')
  } else if (method === 'PUT' && url.includes('/agents')) {
    toast.success('Agent updated successfully!')
  } else if (method === 'DELETE' && url.includes('/agents')) {
    // toast.success('Agent deleted successfully!')
  } else if (method === 'POST' && url.includes('/upload')) {
    toast.success('Files uploaded successfully!')
  }

  return response
}

/**
 * Handle response errors with user-friendly messages
 */
const handleResponseError = (error: AxiosError): Promise<never> => {
  const response = error.response
  const request = error.request

  console.error('❌ API Error:', {
    message: error.message,
    status: response?.status,
    data: response?.data,
    url: error.config?.url,
  })

  // Handle specific error types
  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    toast.error(ERROR_MESSAGES.TIMEOUT_ERROR)
    return Promise.reject(error)
  }

  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    toast.error(ERROR_MESSAGES.CONNECTION_ERROR)
    return Promise.reject(error)
  }

  // Network errors (no response received)
  if (!response && request) {
    toast.error(ERROR_MESSAGES.NETWORK_ERROR)
    return Promise.reject(error)
  }

  // HTTP errors (response received with error status)
  if (response) {
    handleHttpError(response.status, response.data as ApiResponse, error.config?.url)
  } else {
    toast.error(ERROR_MESSAGES.REQUEST_FAILED)
  }

  return Promise.reject(error)
}

/**
 * Extract data from API response
 */
const extractData = <T>(response: ApiResponse<T>): T => {
  // Handle case where response is directly an array (deployments API)
  if (Array.isArray(response)) {
    return response as T
  }
  
  if (response.success === false) {
    console.error('❌ API request failed:', response.error)
    throw new Error(response.error?.message || 'API request failed')
  }
  
  // Handle specific backend response format for agents
  if ((response as any).agents) {
    return (response as any).agents as T
  }
  
  // Handle single agent response
  if ((response as any).agent) {
    return (response as any).agent as T
  }
  
  return response.data || (response as unknown as T)
}

// ==================== SETUP INTERCEPTORS ====================

// Request interceptor
axiosInstance.interceptors.request.use(handleRequest, handleRequestError)

// Response interceptor
axiosInstance.interceptors.response.use(handleResponse, handleResponseError)

// Load auth token on initialization
loadAuthToken()

// ==================== UTILITY FUNCTIONS ====================

/**
 * Show error toast with custom message
 */
export const showErrorToast = (message: string): void => {
  toast.error(message)
}

/**
 * Show success toast with custom message
 */
export const showSuccessToast = (message: string): void => {
  toast.success(message)
}

/**
 * Show info toast with custom message
 */
export const showInfoToast = (message: string): void => {
  toast(message, {
    icon: 'ℹ️',
    style: {
      background: '#3b82f6',
      color: '#fff',
    },
  })
}

// ==================== AUTH FUNCTIONS ====================

/**
 * Set authentication token
 */
export const setAuthToken = (token: string): void => {
  authToken = token
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token)
  }
}

/**
 * Clear authentication token
 */
export const clearAuthToken = (): void => {
  authToken = null
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
  }
}

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!authToken
}

/**
 * Get current auth token
 */
export const getAuthToken = (): string | null => {
  return authToken
}

/**
 * Get base URL
 */
export const getBaseURL = (): string => {
  return NEXT_PUBLIC_BACKEND_API_URL
}

// ==================== HTTP METHODS ====================

/**
 * Generic GET request
 */
export const httpGet = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  const response = await axiosInstance.get<ApiResponse<T>>(url, config)
  return extractData(response.data)
}

/**
 * Generic POST request
 */
export const httpPost = async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
  const response = await axiosInstance.post<ApiResponse<T>>(url, data, config)
  return extractData(response.data)
}

/**
 * Generic PUT request
 */
export const httpPut = async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
  const response = await axiosInstance.put<ApiResponse<T>>(url, data, config)
  return extractData(response.data)
}

/**
 * Generic PATCH request
 */
export const httpPatch = async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
  const response = await axiosInstance.patch<ApiResponse<T>>(url, data, config)
  return extractData(response.data)
}

/**
 * Generic DELETE request
 */
export const httpDelete = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  const response = await axiosInstance.delete<ApiResponse<T>>(url, config)
  return extractData(response.data)
}

/**
 * File upload with progress tracking
 */
export const httpUpload = async <T>(
  url: string,
  formData: FormData,
  onProgress?: (progress: number) => void
): Promise<T> => {
  const config: AxiosRequestConfig = {
    headers: {
      [HEADERS.CONTENT_TYPE]: 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        onProgress(progress)
      }
    },
  }

  const response = await axiosInstance.post<ApiResponse<T>>(url, formData, config)
  return extractData(response.data)
}

/**
 * Health check
 */
export const healthCheck = async (): Promise<{ status: string; timestamp: string }> => {
  return httpGet('/api/health')
}

// Export the axios instance for direct access if needed
export { axiosInstance }
export default axiosInstance

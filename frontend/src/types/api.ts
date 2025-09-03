/**
 * API Response Types
 * Base types for API communication
 */

// Base API Response Structure
export type ApiResponse<T = any> = {
  success: boolean
  data?: T
  error?: ApiError
}

// API Error Structure
export type ApiError = {
  message: string
  code: string
  status: string
  details?: any
  timestamp: string
  id: string
}

// HTTP Methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

// Request Config
export type RequestConfig = {
  url: string
  method: HttpMethod
  data?: any
  params?: Record<string, any>
  headers?: Record<string, string>
  onUploadProgress?: (progress: number) => void
  onDownloadProgress?: (progress: number) => void
}

// Pagination Types
export type PaginationParams = {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export type PaginatedResponse<T> = {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

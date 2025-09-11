/**
 * Search Types
 * All types related to search and document retrieval
 */

// Search Result
export type SearchResult = {
  results: SearchResultItem[]
  query: SearchQuery
  searchedAt: string
}

// Individual Search Result Item
export type SearchResultItem = {
  id: string
  score: number
  content: string
  metadata: SearchResultMetadata
}

// Search Result Metadata
export type SearchResultMetadata = {
  fileId: string
  chunkIndex: number
  filename: string
  chunkLength: number
  method: string
  contentHash: string
  companyId?: string
  userId?: string
}

// Search Query Info
export type SearchQuery = {
  collectionName: string
  limit: number
  threshold: number
  resultsFound: number
  query?: string
}

// Search Options
export type SearchOptions = {
  limit?: number
  threshold?: number
  filters?: SearchFilters
}

// Search Filters
export type SearchFilters = {
  fileIds?: string[]
  dateRange?: {
    from: string
    to: string
  }
  fileTypes?: string[]
}

// Search Statistics
export type SearchStats = {
  totalQueries: number
  averageResultCount: number
  popularSearchTerms: string[]
  responseTime: {
    average: number
    median: number
  }
  collectionInfo: {
    pointsCount: number
    vectorSize: number
    status: string
  }
}

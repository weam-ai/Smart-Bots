/**
 * Search API Hooks
 * Custom hooks for document search operations
 */

import { useState, useCallback } from 'react'
import { httpGet, httpPost } from '@/services/axios'
import { API_ENDPOINTS } from '@/utils/constants'
import type { SearchResult, SearchOptions, SearchStats } from '@/types/search'
import toast from 'react-hot-toast'

// ==================== DOCUMENT SEARCH ====================

export const useDocumentSearch = () => {
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchHistory, setSearchHistory] = useState<string[]>([])

  const searchDocuments = useCallback(async (
    agentId: string,
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult | null> => {
    if (!query.trim()) {
      toast.error('Please enter a search query')
      return null
    }

    try {
      setIsSearching(true)
      setError(null)

      const result = await httpPost<SearchResult>(
        API_ENDPOINTS.SEARCH.BY_AGENT(agentId),
        {
          query: query.trim(),
          ...options,
        }
      )

      setSearchResults(result)
      
      // Add to search history (keep last 10)
      setSearchHistory(prev => {
        const newHistory = [query.trim(), ...prev.filter(q => q !== query.trim())]
        return newHistory.slice(0, 10)
      })

      // Show results summary
      const { resultsFound } = result.query
      if (resultsFound === 0) {
        toast('No documents found for your query', { icon: 'ℹ️' })
      } else {
        toast.success(`Found ${resultsFound} relevant document${resultsFound !== 1 ? 's' : ''}`)
      }

      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed'
      setError(message)
      toast.error(message)
      return null
    } finally {
      setIsSearching(false)
    }
  }, [])

  const clearResults = useCallback(() => {
    setSearchResults(null)
    setError(null)
  }, [])

  const clearHistory = useCallback(() => {
    setSearchHistory([])
  }, [])

  return {
    searchDocuments,
    searchResults,
    isSearching,
    error,
    searchHistory,
    clearResults,
    clearHistory,
  }
}

// ==================== SEARCH STATISTICS ====================

export const useSearchStats = (agentId: string) => {
  const [stats, setStats] = useState<SearchStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    if (!agentId) return

    try {
      setIsLoading(true)
      setError(null)
      const data = await httpGet<SearchStats>(API_ENDPOINTS.SEARCH.STATS(agentId))
      setStats(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch search statistics'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [agentId])

  const refetch = useCallback(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    isLoading,
    error,
    fetchStats,
    refetch,
  }
}

// ==================== SEARCH TEST ====================

export const useSearchTest = () => {
  const [testResults, setTestResults] = useState<any>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runSearchTest = useCallback(async (agentId: string): Promise<any> => {
    try {
      setIsRunning(true)
      setError(null)

      const result = await httpPost<any>(API_ENDPOINTS.SEARCH.TEST(agentId))
      setTestResults(result)

      toast.success('Search test completed successfully')
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search test failed'
      setError(message)
      toast.error(message)
      return null
    } finally {
      setIsRunning(false)
    }
  }, [])

  const clearTestResults = useCallback(() => {
    setTestResults(null)
    setError(null)
  }, [])

  return {
    runSearchTest,
    testResults,
    isRunning,
    error,
    clearTestResults,
  }
}

// ==================== SEARCH FILTERS ====================

export const useSearchFilters = () => {
  const [filters, setFilters] = useState<SearchOptions>({
    limit: 10,
    threshold: 0.7,
  })

  const updateFilter = useCallback(<K extends keyof SearchOptions>(
    key: K,
    value: SearchOptions[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters({
      limit: 10,
      threshold: 0.7,
    })
  }, [])

  const applyFilters = useCallback((searchFn: (options: SearchOptions) => void) => {
    searchFn(filters)
  }, [filters])

  return {
    filters,
    updateFilter,
    resetFilters,
    applyFilters,
  }
}

// ==================== SEARCH SUGGESTIONS ====================

export const useSearchSuggestions = () => {
  const [suggestions, setSuggestions] = useState<string[]>([])

  const generateSuggestions = useCallback((query: string, searchHistory: string[]) => {
    if (!query.trim()) {
      setSuggestions([])
      return
    }

    const queryLower = query.toLowerCase()
    
    // Filter history based on current query
    const historySuggestions = searchHistory
      .filter(item => item.toLowerCase().includes(queryLower) && item !== query)
      .slice(0, 3)

    // Add some common search patterns
    const commonSuggestions = [
      `How to ${query}`,
      `What is ${query}`,
      `${query} tutorial`,
      `${query} guide`,
      `${query} examples`,
    ].filter(suggestion => 
      suggestion.toLowerCase() !== query.toLowerCase()
    ).slice(0, 2)

    setSuggestions([
      ...historySuggestions,
      ...commonSuggestions,
    ].slice(0, 5))
  }, [])

  const clearSuggestions = useCallback(() => {
    setSuggestions([])
  }, [])

  return {
    suggestions,
    generateSuggestions,
    clearSuggestions,
  }
}

// ==================== COMBINED SEARCH HOOK ====================

export const useCompleteSearch = (agentId: string) => {
  const {
    searchDocuments,
    searchResults,
    isSearching,
    error: searchError,
    searchHistory,
    clearResults,
    clearHistory,
  } = useDocumentSearch()

  const {
    stats,
    isLoading: isLoadingStats,
    error: statsError,
    fetchStats,
  } = useSearchStats(agentId)

  const {
    runSearchTest,
    testResults,
    isRunning: isRunningTest,
    error: testError,
    clearTestResults,
  } = useSearchTest()

  const {
    filters,
    updateFilter,
    resetFilters,
  } = useSearchFilters()

  const {
    suggestions,
    generateSuggestions,
    clearSuggestions,
  } = useSearchSuggestions()

  // Enhanced search with filters
  const performSearch = useCallback(async (query: string): Promise<SearchResult | null> => {
    const result = await searchDocuments(agentId, query, filters)
    if (result) {
      // Refresh stats after successful search
      fetchStats()
    }
    return result
  }, [searchDocuments, agentId, filters, fetchStats])

  // Auto-generate suggestions based on query and history
  const handleQueryChange = useCallback((query: string) => {
    generateSuggestions(query, searchHistory)
  }, [generateSuggestions, searchHistory])

  return {
    // Search operations
    performSearch,
    searchResults,
    isSearching,
    searchError,
    
    // Search history and suggestions
    searchHistory,
    suggestions,
    handleQueryChange,
    clearResults,
    clearHistory,
    clearSuggestions,
    
    // Filters
    filters,
    updateFilter,
    resetFilters,
    
    // Statistics
    stats,
    isLoadingStats,
    statsError,
    fetchStats,
    
    // Testing
    runSearchTest: () => runSearchTest(agentId),
    testResults,
    isRunningTest,
    testError,
    clearTestResults,
  }
}

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Custom Hook for Pagination
 * Implements pagination support across list components
 * Fixes: Issue #13 (Frontend: Implement pagination support)
 */
export const usePagination = (initialPageSize = 20) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = Math.ceil(totalCount / pageSize);

  const handlePageChange = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo(0, 0); // Scroll to top on page change
    }
  }, [totalPages]);

  const handlePageSizeChange = useCallback((newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when page size changes
  }, []);

  const getPaginationParams = useCallback(() => {
    return {
      page: currentPage,
      page_size: pageSize,
    };
  }, [currentPage, pageSize]);

  const updateTotalCount = useCallback((count) => {
    setTotalCount(count);
  }, []);

  const resetPagination = useCallback(() => {
    setCurrentPage(1);
    setPageSize(initialPageSize);
    setTotalCount(0);
  }, [initialPageSize]);

  return {
    currentPage,
    pageSize,
    totalCount,
    totalPages,
    getPaginationParams,
    handlePageChange,
    handlePageSizeChange,
    updateTotalCount,
    resetPagination,
  };
};

/**
 * Custom Hook for Form Autosave
 * Automatically saves form data to localStorage and backend
 * Fixes: Issue #14 (Frontend: Add form autosave)
 */
export const useFormAutosave = (formId, initialData = {}, autosaveInterval = 10000) => {
  const [formData, setFormData] = useState(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  // Save to localStorage
  const saveToLocalStorage = useCallback((data) => {
    try {
      localStorage.setItem(`form_draft_${formId}`, JSON.stringify({
        data,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      console.warn('Failed to save form to localStorage:', error);
    }
  }, [formId]);

  // Load from localStorage
  const loadFromLocalStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(`form_draft_${formId}`);
      if (stored) {
        const { data } = JSON.parse(stored);
        setFormData(data);
        return data;
      }
    } catch (error) {
      console.warn('Failed to load form from localStorage:', error);
    }
    return null;
  }, [formId]);

  // Clear localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(`form_draft_${formId}`);
      setIsDirty(false);
      setLastSavedTime(null);
    } catch (error) {
      console.warn('Failed to clear form draft:', error);
    }
  }, [formId]);

  // Update form field
  const handleFieldChange = useCallback((fieldName, value) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
    setIsDirty(true);
    
    // Auto-save to localStorage immediately
    saveToLocalStorage({
      ...formData,
      [fieldName]: value,
    });
  }, [formData, saveToLocalStorage]);

  // Auto-save to backend periodically
  const autoSaveToBackend = useCallback(async (apiFunction) => {
    if (!isDirty) return;

    setIsSaving(true);
    try {
      await apiFunction(formData);
      setLastSavedTime(new Date());
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to autosave form:', error);
    } finally {
      setIsSaving(false);
    }
  }, [formData, isDirty]);

  return {
    formData,
    setFormData,
    handleFieldChange,
    isSaving,
    lastSavedTime,
    isDirty,
    saveToLocalStorage,
    loadFromLocalStorage,
    clearDraft,
    autoSaveToBackend,
  };
};

/**
 * Custom Hook for API Error Handling
 * Standardized error handling with retry logic
 * Fixes: Issue #15 (Frontend: Improve error handling)
 */
export const useAPIErrorHandling = () => {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleError = useCallback((err) => {
    if (err.response) {
      // Server responded with error status
      const { status, data } = err.response;
      const errorMessage = data?.error?.message || data?.message || 'An error occurred';
      const errorCode = data?.error?.code || 'UNKNOWN_ERROR';
      
      setError({
        code: errorCode,
        message: errorMessage,
        status,
        fieldErrors: data?.error?.field_errors || {},
      });
    } else if (err.request) {
      // Request made but no response received
      setError({
        code: 'NETWORK_ERROR',
        message: 'Network error. Please check your internet connection.',
        status: 0,
      });
    } else {
      // Error in request setup
      setError({
        code: 'REQUEST_ERROR',
        message: err.message || 'An error occurred',
        status: 0,
      });
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Retry with exponential backoff
  const retryWithBackoff = useCallback(
    async (apiCall, maxRetries = 3) => {
      let lastError;
      
      for (let i = 0; i < maxRetries; i++) {
        try {
          setIsLoading(true);
          const result = await apiCall();
          setIsLoading(false);
          clearError();
          return result;
        } catch (err) {
          lastError = err;
          
          // Don't retry on client errors (4xx)
          if (err.response?.status >= 400 && err.response?.status < 500) {
            handleError(err);
            setIsLoading(false);
            throw err;
          }
          
          // Exponential backoff: 1s, 2s, 4s
          if (i < maxRetries - 1) {
            const delay = Math.pow(2, i) * 1000;
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }
      
      handleError(lastError);
      setIsLoading(false);
      throw lastError;
    },
    [handleError, clearError]
  );

  return {
    error,
    isLoading,
    handleError,
    clearError,
    retryWithBackoff,
    setIsLoading,
  };
};

/**
 * Custom Hook for Debounced Search
 * Implements debounced search to prevent excessive API calls
 * Fixes: Issue #15 (Frontend: Improve error handling - network optimization)
 */
export const useDebouncedSearch = (onSearch, delay = 500) => {
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const timeoutRef = useRef(null);

  const handleSearch = useCallback((value) => {
    setSearchText(value);
    setIsSearching(true);

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(async () => {
      try {
        await onSearch(value);
      } finally {
        setIsSearching(false);
      }
    }, delay);
  }, [onSearch, delay]);

  const clearSearch = useCallback(() => {
    setSearchText('');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    searchText,
    isSearching,
    handleSearch,
    clearSearch,
  };
};

import { useState, useCallback } from 'react';

export const useLoadingState = (initialState = false) => {
  const [loading, setLoading] = useState(initialState);
  const [error, setError] = useState(null);
  
  const startLoading = useCallback(() => {
    setLoading(true);
    setError(null);
  }, []);
  
  const stopLoading = useCallback(() => {
    setLoading(false);
  }, []);
  
  const setErrorState = useCallback((errorMessage) => {
    setError(errorMessage);
    setLoading(false);
  }, []);
  
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);
  
  return {
    loading,
    error,
    startLoading,
    stopLoading,
    setErrorState,
    reset,
  };
};









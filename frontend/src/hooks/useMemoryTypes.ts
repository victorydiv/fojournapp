import { useState, useEffect } from 'react';
import { MemoryType } from '../types';
import { memoryTypesAPI } from '../services/memoryTypes';

export const useMemoryTypes = () => {
  const [memoryTypes, setMemoryTypes] = useState<MemoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMemoryTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      const types = await memoryTypesAPI.getMemoryTypes();
      setMemoryTypes(types);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memory types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemoryTypes();

    // Listen for cache invalidations
    const cleanup = memoryTypesAPI.addCacheInvalidationListener(() => {
      loadMemoryTypes();
    });

    return cleanup;
  }, []);

  const refreshMemoryTypes = () => {
    memoryTypesAPI.clearCache();
    loadMemoryTypes();
  };

  return {
    memoryTypes,
    loading,
    error,
    refreshMemoryTypes
  };
};
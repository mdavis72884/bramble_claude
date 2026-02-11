import { useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiOptions {
  showErrorToast?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export function useApi<T = any>(options: UseApiOptions = {}) {
  const { showErrorToast = true, onSuccess, onError } = options;
  const { toast } = useToast();
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (url: string, fetchOptions?: RequestInit): Promise<{ data: T | null; error: string | null }> => {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const { data, error } = await apiFetch<T>(url, fetchOptions);
      
      if (error) {
        setState({ data: null, loading: false, error });
        if (showErrorToast) {
          toast({ title: "Error", description: error, variant: "destructive" });
        }
        onError?.(error);
        return { data: null, error };
      }
      
      setState({ data, loading: false, error: null });
      onSuccess?.(data);
      return { data, error: null };
    },
    [showErrorToast, onSuccess, onError, toast]
  );

  const get = useCallback(
    (url: string) => execute(url, { method: "GET" }),
    [execute]
  );

  const post = useCallback(
    (url: string, body: any) =>
      execute(url, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    [execute]
  );

  const patch = useCallback(
    (url: string, body: any) =>
      execute(url, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    [execute]
  );

  const del = useCallback(
    (url: string) => execute(url, { method: "DELETE" }),
    [execute]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    get,
    post,
    patch,
    delete: del,
    reset,
  };
}

export function useApiQuery<T = any>(
  url: string | null,
  options: UseApiOptions & { enabled?: boolean } = {}
) {
  const { enabled = true, ...apiOptions } = options;
  const { toast } = useToast();
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: enabled && !!url,
    error: null,
  });
  const [hasLoaded, setHasLoaded] = useState(false);

  const refetch = useCallback(async () => {
    if (!url) return;
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    const { data, error } = await apiFetch<T>(url);
    
    if (error) {
      setState({ data: null, loading: false, error });
      if (apiOptions.showErrorToast !== false) {
        toast({ title: "Error", description: error, variant: "destructive" });
      }
      apiOptions.onError?.(error);
    } else {
      setState({ data, loading: false, error: null });
      apiOptions.onSuccess?.(data);
    }
    setHasLoaded(true);
  }, [url, apiOptions, toast]);

  if (enabled && url && !hasLoaded && !state.loading) {
    refetch();
  }

  return { ...state, refetch };
}

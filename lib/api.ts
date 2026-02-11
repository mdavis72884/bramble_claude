export async function apiFetch<T = any>(url: string, options?: RequestInit): Promise<{ data: T | null; error: string | null }> {
  const token = localStorage.getItem("accessToken");
  const headers: Record<string, string> = {
    ...((options?.headers as Record<string, string>) || {}),
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  if (options?.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  
  try {
    const response = await fetch(url, { ...options, headers });
    
    if (response.status === 401) {
      window.location.href = "/login";
      return { data: null, error: "Session expired" };
    }
    
    if (response.status === 403) {
      return { data: null, error: "You don't have permission to access this resource" };
    }
    
    if (response.status === 204 || response.headers.get("content-length") === "0") {
      if (response.ok) {
        return { data: null, error: null };
      }
      return { data: null, error: `Request failed with status ${response.status}` };
    }
    
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      if (response.ok) {
        return { data: null, error: null };
      }
      return { data: null, error: `Request failed with status ${response.status}` };
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      return { data: null, error: data.error || data.message || `Request failed with status ${response.status}` };
    }
    
    return { data, error: null };
  } catch (err) {
    return { data: null, error: "Network error. Please check your connection." };
  }
}

export function getAuthHeaders() {
  const token = localStorage.getItem("accessToken");
  return { Authorization: `Bearer ${token}` };
}

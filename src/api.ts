const API_BASE = "/api";

export async function fetchWithAuth(url: string, options: any = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${url}`, { ...options, headers });
  if (response.status === 401) {
    localStorage.removeItem("token");
    window.location.reload();
  }
  return response;
}

export const api = {
  auth: {
    login: (credentials: any) => fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    }).then(r => r.json()),
    register: (data: any) => fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),
    google: (credential: string) => fetch(`${API_BASE}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    }).then(r => r.json()),
    me: () => fetchWithAuth("/auth/me").then(r => r.json()),
  },
  trips: {
    list: () => fetchWithAuth("/trips").then(r => r.json()),
    create: (data: any) => fetchWithAuth("/trips", {
      method: "POST",
      body: JSON.stringify(data),
    }).then(r => r.json()),
    delete: (id: string) => fetchWithAuth(`/trips/${id}`, {
      method: "DELETE",
    }).then(r => r.json()),
  },
  fuel: {
    list: () => fetchWithAuth("/fuel").then(r => r.json()),
    create: (data: any) => fetchWithAuth("/fuel", {
      method: "POST",
      body: JSON.stringify(data),
    }).then(r => r.json()),
    delete: (id: string) => fetchWithAuth(`/fuel/${id}`, {
      method: "DELETE",
    }).then(r => r.json()),
  },
  trucks: {
    list: () => fetchWithAuth("/trucks").then(r => r.json()),
    create: (data: any) => fetchWithAuth("/trucks", {
      method: "POST",
      body: JSON.stringify(data),
    }).then(r => r.json()),
    delete: (id: string) => fetchWithAuth(`/trucks/${id}`, {
      method: "DELETE",
    }).then(r => r.json()),
  },
};

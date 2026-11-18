import type {
  AuditLogItem,
  Catalog,
  CheckAllResult,
  IntegrityCheckDetail,
  RecentCheck,
  Score,
  ScoreDetail,
  User,
  WalletRow,
} from "./types";

const TOKEN_KEY = "blockchain_db_integrity_token";
const USER_KEY = "blockchain_db_integrity_user";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuthSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(endpoint, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && token) {
      clearAuthSession();
    }
    const details = Array.isArray(data.details)
      ? data.details.map((d: any) => `${d.field ? `${d.field}: ` : ""}${d.message}`).join(", ")
      : "";
    throw new Error(
      data.message ? `${data.message}${details ? ` (${details})` : ""}` : `Lỗi yêu cầu: ${response.statusText}`
    );
  }
  return data as T;
}

const post = <T>(url: string, body?: unknown) =>
  request<T>(url, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

export const api = {
  async login(username: string, password: string): Promise<{ token: string; user: User }> {
    const res = await post<{ token: string; user: User }>("/api/auth/login", { username, password });
    setAuthSession(res.token, res.user);
    return res;
  },

  getCatalog: () => request<Catalog>("/api/scores/catalog"),

  getScores(params: { search?: string; semester?: string } = {}) {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.semester) qs.set("semester", params.semester);
    const q = qs.toString();
    return request<Score[]>(`/api/scores${q ? `?${q}` : ""}`);
  },

  getScoreById: (id: number) => request<ScoreDetail>(`/api/scores/${id}`),

  createScore: (payload: { studentId: string; courseCode: string; semester: string; score: number }) =>
    post<{ score: Score; transactionHash: string; signer: string }>("/api/scores", payload),

  updateScore: (id: number, score: number) =>
    request<{ score: Score; transactionHash: string; signer: string }>(`/api/scores/${id}`, {
      method: "PUT",
      body: JSON.stringify({ score }),
    }),

  checkIntegrity: (id: number) => post<IntegrityCheckDetail>(`/api/integrity/check/${id}`),
  checkAll: () => post<CheckAllResult>("/api/integrity/check-all"),
  getRecentChecks: (limit = 15) => request<RecentCheck[]>(`/api/integrity/results?limit=${limit}`),

  getWallets: () => request<WalletRow[]>("/api/wallets"),

  async getAuditLogs(params: { search?: string; actor?: string; action?: string; limit?: number } = {}) {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.actor) qs.set("actor", params.actor);
    if (params.action) qs.set("action", params.action);
    if (params.limit) qs.set("limit", params.limit.toString());
    const q = qs.toString();
    return request<{ total: number; logs: AuditLogItem[] }>(`/api/audit-logs${q ? `?${q}` : ""}`);
  },
};

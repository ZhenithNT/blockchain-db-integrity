import type {
  DashboardData,
  IntegrityCheckDetail,
  Score,
  ScoreVersion,
  User,
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

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      // Token hết hạn
      clearAuthSession();
    }
    const message = data.message || `Lỗi yêu cầu: ${response.statusText}`;
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  async login(username: string, password: string): Promise<{ token: string; user: User }> {
    const res = await request<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setAuthSession(res.token, res.user);
    return res;
  },

  async getHealth() {
    return request<{
      status: string;
      database: string;
      blockchain: string;
      timestamp: string;
    }>("/api/health");
  },

  async getDashboard(): Promise<DashboardData> {
    return request<DashboardData>("/api/dashboard");
  },

  async getScores(filters: { search?: string; status?: string; semester?: string } = {}): Promise<Score[]> {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);
    if (filters.semester) params.set("semester", filters.semester);

    const qs = params.toString();
    return request<Score[]>(`/api/scores${qs ? `?${qs}` : ""}`);
  },

  async getScoreById(id: number): Promise<Score> {
    return request<Score>(`/api/scores/${id}`);
  },

  async getScoreHistory(id: number): Promise<ScoreVersion[]> {
    return request<ScoreVersion[]>(`/api/scores/${id}/history`);
  },

  async createScore(data: {
    studentId: string;
    courseCode: string;
    semester: string;
    score: number;
  }): Promise<{ score: Score; transactionHash: string; blockNumber: string }> {
    return request("/api/scores", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateScore(id: number, score: number): Promise<{ score: Score; transactionHash: string; blockNumber: string }> {
    return request(`/api/scores/${id}`, {
      method: "PUT",
      body: JSON.stringify({ score }),
    });
  },

  async deleteScore(id: number): Promise<{ score: Score; transactionHash: string; blockNumber: string }> {
    return request(`/api/scores/${id}`, {
      method: "DELETE",
    });
  },

  async checkIntegrity(scoreId: number): Promise<IntegrityCheckDetail> {
    return request<IntegrityCheckDetail>(`/api/integrity/check/${scoreId}`, {
      method: "POST",
    });
  },

  async checkAllIntegrity(): Promise<{
    total: number;
    valid: number;
    invalid: number;
    pending: number;
    error: number;
    results: IntegrityCheckDetail[];
  }> {
    return request("/api/integrity/check-all", {
      method: "POST",
    });
  },

  async getRecentIntegrityResults(limit = 20) {
    return request<any[]>(`/api/integrity/results?limit=${limit}`);
  },

  async demoTamper(scoreId: number, score: string | number) {
    return request<{
      warning: string;
      score: Score;
      originalScore: string;
      tamperedScore: string;
    }>("/api/demo/tamper", {
      method: "POST",
      body: JSON.stringify({ scoreId, score }),
    });
  },

  async demoRestore(scoreId: number) {
    return request<{
      message: string;
      score: Score;
      restoredFromVersion: number;
    }>("/api/demo/restore", {
      method: "POST",
      body: JSON.stringify({ scoreId }),
    });
  },
};

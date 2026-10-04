import type {
  CourseOffering,
  CourseOfferingDetail,
  DashboardData,
  IntegrityCheckDetail,
  MissingRecordItem,
  NotificationItem,
  Score,
  ScoreChangeRequest,
  ScoreVersion,
  StudentTranscriptItem,
  User,
  LecturerItem,
  StudentItem,
  CourseItem,
  SemesterItem,
  AuditLogItem,
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
      clearAuthSession();
    }
    const details = Array.isArray(data.details)
      ? data.details.map((d: any) => `${d.field ? `${d.field}: ` : ""}${d.message}`).join(", ")
      : "";
    const message = data.message
      ? `${data.message}${details ? ` (${details})` : ""}`
      : `Lỗi yêu cầu: ${response.statusText}`;
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  // Auth
  async login(username: string, password: string): Promise<{ token: string; user: User }> {
    const res = await request<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setAuthSession(res.token, res.user);
    return res;
  },

  async register(payload: {
    username: string;
    password: string;
    fullName: string;
    role: "STUDENT" | "LECTURER";
    code?: string;
    email?: string;
    extraInfo?: string;
  }): Promise<{ token: string; user: User }> {
    const res = await request<{ token: string; user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
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

  // Course Offerings & Grading Sheet
  async getOfferings(filter?: {
    semester?: string;
    status?: string;
    myClasses?: boolean;
  }): Promise<CourseOffering[]> {
    const params = new URLSearchParams();
    if (filter?.semester) params.set("semester", filter.semester);
    if (filter?.status) params.set("status", filter.status);
    if (filter?.myClasses) params.set("myClasses", "true");
    const qs = params.toString();
    return request<CourseOffering[]>(`/api/offerings${qs ? `?${qs}` : ""}`);
  },

  async getOfferingById(id: number): Promise<CourseOfferingDetail> {
    return request<CourseOfferingDetail>(`/api/offerings/${id}`);
  },

  async saveClassScores(
    offeringId: number,
    scores: {
      enrollmentId?: number;
      studentCode?: string;
      attendanceScore?: number;
      midtermScore?: number;
      finalScore?: number;
    }[],
    isDraft: boolean
  ) {
    return request<{
      success: boolean;
      message: string;
      count: number;
      isDraft: boolean;
    }>(`/api/offerings/${offeringId}/grades`, {
      method: "POST",
      body: JSON.stringify({ offeringId, scores, isDraft }),
    });
  },

  async updateOfferingStatus(id: number, status: string) {
    return request<{
      id: number;
      status: string;
      message: string;
    }>(`/api/offerings/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  },

  async approveClassScores(offeringId: number) {
    return request<{
      success: boolean;
      message: string;
      processedCount: number;
      confirmedCount: number;
    }>(`/api/offerings/${offeringId}/approve`, {
      method: "POST",
    });
  },

  // Student Scores
  async getMyGrades(): Promise<StudentTranscriptItem[]> {
    return request<StudentTranscriptItem[]>("/api/scores/my-grades");
  },

  async getStudentScores(studentCode: string): Promise<StudentTranscriptItem[]> {
    return request<StudentTranscriptItem[]>(`/api/scores/student/${studentCode}`);
  },

  // Score CRUD (Admin / General)
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

  // Score Change Requests
  async getChangeRequests(filter?: {
    status?: string;
    myRequests?: boolean;
  }): Promise<ScoreChangeRequest[]> {
    const params = new URLSearchParams();
    if (filter?.status) params.set("status", filter.status);
    if (filter?.myRequests) params.set("myRequests", "true");
    const qs = params.toString();
    return request<ScoreChangeRequest[]>(`/api/change-requests${qs ? `?${qs}` : ""}`);
  },

  async createChangeRequest(data: {
    scoreId: number;
    proposedScore: number | string;
    proposedAttendance?: number;
    proposedMidterm?: number;
    proposedFinal?: number;
    reason: string;
    evidenceAttachment?: string;
  }): Promise<ScoreChangeRequest> {
    return request<ScoreChangeRequest>("/api/change-requests", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async reviewChangeRequest(
    id: number,
    decision: "APPROVED" | "REJECTED",
    reviewNote?: string
  ) {
    return request<{
      success: boolean;
      message: string;
      transactionHash?: string;
      version?: number;
    }>(`/api/change-requests/${id}/review`, {
      method: "PUT",
      body: JSON.stringify({ status: decision, reviewNote }),
    });
  },

  // Notifications
  async getNotifications(): Promise<NotificationItem[]> {
    return request<NotificationItem[]>("/api/notifications");
  },

  async markNotificationAsRead(id: number) {
    return request<{ id: number; isRead: boolean }>(`/api/notifications/${id}/read`, {
      method: "PUT",
    });
  },

  // Integrity Check
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
    missingInDb?: MissingRecordItem[];
  }> {
    return request("/api/integrity/check-all", {
      method: "POST",
    });
  },

  async getRecentIntegrityResults(limit = 20) {
    return request<any[]>(`/api/integrity/results?limit=${limit}`);
  },

  // Demo Attacks & Cryptographic Restore
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

  async demoTamperHistory(scoreId: number, version: number, score: string | number) {
    return request<{
      warning: string;
      scoreId: number;
      version: number;
      originalScore: string;
      tamperedScore: string;
    }>("/api/demo/tamper-history", {
      method: "POST",
      body: JSON.stringify({ scoreId, version, score }),
    });
  },

  async demoTamperDelete(scoreId: number) {
    return request<{
      warning: string;
      scoreId: number;
      deletedRecordKey: string;
    }>("/api/demo/tamper-delete", {
      method: "POST",
      body: JSON.stringify({ scoreId }),
    });
  },

  async demoRestore(scoreId: number) {
    return request<{
      message: string;
      score: Score;
      restoredFromVersion: number;
      action?: string;
    }>("/api/demo/restore", {
      method: "POST",
      body: JSON.stringify({ scoreId }),
    });
  },

  // Academic Management (Giảng viên, Sinh viên, Môn học, Học kỳ, Lớp)
  async getLecturers(): Promise<LecturerItem[]> {
    return request<LecturerItem[]>("/api/academic/lecturers");
  },

  async createLecturer(payload: {
    lecturerCode: string;
    fullName: string;
    faculty?: string;
    email?: string;
    username?: string;
    password?: string;
  }): Promise<{ lecturer: LecturerItem; user: any }> {
    return request("/api/academic/lecturers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getStudents(): Promise<StudentItem[]> {
    return request<StudentItem[]>("/api/academic/students");
  },

  async createStudent(payload: {
    studentCode: string;
    fullName: string;
    className?: string;
    email?: string;
    username?: string;
    password?: string;
  }): Promise<{ student: StudentItem; user: any }> {
    return request("/api/academic/students", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getCourses(): Promise<CourseItem[]> {
    return request<CourseItem[]>("/api/academic/courses");
  },

  async createCourse(payload: {
    code: string;
    name: string;
    credits?: number;
    department?: string;
  }): Promise<CourseItem> {
    return request("/api/academic/courses", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getSemesters(): Promise<SemesterItem[]> {
    return request<SemesterItem[]>("/api/academic/semesters");
  },

  async createSemester(payload: {
    code: string;
    name: string;
    isCurrent?: boolean;
  }): Promise<SemesterItem> {
    return request("/api/academic/semesters", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async createOffering(payload: {
    offeringCode: string;
    courseCode: string;
    semesterCode?: string;
    room?: string;
    maxStudents?: number;
  }): Promise<CourseOffering> {
    return request("/api/academic/offerings", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async assignLecturer(offeringId: number, payload: {
    lecturerCode: string;
    role?: string;
    canGrade?: boolean;
  }) {
    return request(`/api/academic/offerings/${offeringId}/assign-lecturer`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async enrollStudent(offeringId: number, studentCode: string) {
    return request(`/api/academic/offerings/${offeringId}/enroll-student`, {
      method: "POST",
      body: JSON.stringify({ studentCode }),
    });
  },

  // Student self-enrollment
  async studentEnroll(offeringId: number) {
    return request(`/api/academic/offerings/${offeringId}/enroll`, {
      method: "POST",
    });
  },

  async studentUnenroll(offeringId: number) {
    return request(`/api/academic/offerings/${offeringId}/enroll`, {
      method: "DELETE",
    });
  },

  // Audit Logs
  async getAuditLogs(params: { search?: string; actor?: string; action?: string; limit?: number } = {}) {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.actor) qs.set("actor", params.actor);
    if (params.action) qs.set("action", params.action);
    if (params.limit) qs.set("limit", params.limit.toString());
    const query = qs.toString();
    return request<{ total: number; logs: AuditLogItem[] }>(`/api/audit-logs${query ? `?${query}` : ""}`);
  },
};

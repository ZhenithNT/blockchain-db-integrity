export type UserRole = "ADMIN" | "LECTURER" | "AUDITOR" | "STUDENT";

export interface User {
  id: number;
  username: string;
  fullName: string;
  role: UserRole;
  email?: string | null;
  avatarUrl?: string | null;
  studentCode?: string | null;
  lecturerCode?: string | null;
}

export interface ScoreVersion {
  id: number;
  scoreId: number;
  version: number;
  score: string;
  attendanceScore?: number | null;
  midtermScore?: number | null;
  finalScore?: number | null;
  status: string;
  action: string;
  dataHash: string;
  actorHash: string;
  transactionHash: string | null;
  blockNumber: string | null;
  blockchainTimestamp: string | null;
  syncStatus: string;
  createdAt: string;
}

export interface IntegrityCheckRecord {
  id: number;
  scoreId: number;
  databaseHash: string;
  blockchainHash: string | null;
  databaseVersion: number;
  blockchainVersion: number | null;
  result: "VALID" | "INVALID" | "PENDING" | "ERROR";
  details: string;
  checkedAt: string;
}

export interface Score {
  id: number;
  enrollmentId?: number | null;
  studentId: string;
  courseCode: string;
  offeringCode?: string | null;
  semester: string;
  attendanceScore?: number | null;
  midtermScore?: number | null;
  finalScore?: number | null;
  score: string;
  letterScore?: string | null;
  version: number;
  status: "ACTIVE" | "DELETED";
  recordKey: string;
  dataHash: string;
  blockchainStatus: "CONFIRMED" | "PENDING" | "FAILED";
  latestTxHash?: string | null;
  createdAt: string;
  updatedAt: string;
  latestCheck?: IntegrityCheckRecord | null;
  versions?: ScoreVersion[];
}

export interface HistoryCheckItem {
  version: number;
  databaseHash: string;
  blockchainHash: string | null;
  databaseAction: string;
  blockchainAction: string | null;
  matches: boolean;
  reason?: string;
}

export interface IntegrityCheckDetail {
  scoreId: number;
  studentId: string;
  courseCode: string;
  semester: string;
  recordKey: string;
  databaseScore: string;
  databaseVersion: number;
  databaseHash: string;
  databaseStatus: string;
  blockchainHash: string | null;
  blockchainVersion: number | null;
  blockchainAction: string | null;
  blockchainTimestamp: string | null;
  writerAddress: string | null;
  result: "VALID" | "INVALID" | "PENDING" | "ERROR";
  reason?: string;
  message: string;
  checkedAt: string;
  historyChecks?: HistoryCheckItem[];
}

export interface MissingRecordItem {
  recordKey: string;
  blockchainVersion: number;
  blockchainHash: string;
  blockchainAction: string;
  timestamp?: string;
  error: string;
}

export interface CourseOffering {
  id: number;
  offeringCode: string;
  courseCode: string;
  courseName: string;
  credits: number;
  semesterCode: string;
  semesterName: string;
  room: string;
  maxStudents: number;
  enrolledCount: number;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "PUBLISHED" | "LOCKED";
  submittedAt?: string | null;
  approvedAt?: string | null;
  publishedAt?: string | null;
  lockedAt?: string | null;
  approvedBy?: string | null;
  lecturers: {
    code: string;
    name: string;
    role: string;
    canGrade: boolean;
  }[];
}

export interface StudentScoreRow {
  index?: number;
  enrollmentId: number;
  studentCode: string;
  fullName: string;
  className: string;
  email?: string | null;
  scoreId?: number | null;
  attendanceScore: number | null;
  midtermScore: number | null;
  finalScore: number | null;
  score: string | null;
  letterScore: string | null;
  version?: number;
  status?: string;
  blockchainStatus?: "CONFIRMED" | "PENDING" | "FAILED" | "NOT_REGISTERED";
  recordKey?: string | null;
  dataHash?: string | null;
  latestTxHash?: string | null;
  latestIntegrityResult?: string | null;
  latestIntegrityReason?: string | null;
}

export interface CourseOfferingDetail {
  id: number;
  offeringCode: string;
  courseCode: string;
  courseName: string;
  credits: number;
  semesterCode: string;
  semesterName: string;
  room: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "PUBLISHED" | "LOCKED";
  submittedAt?: string | null;
  approvedAt?: string | null;
  publishedAt?: string | null;
  lockedAt?: string | null;
  approvedBy?: string | null;
  lecturers: {
    code: string;
    name: string;
    role: string;
    canGrade: boolean;
  }[];
  students: StudentScoreRow[];
}

export interface ScoreChangeRequest {
  id: number;
  scoreId: number;
  offeringId: number | null;
  offeringCode?: string | null;
  courseName?: string | null;
  studentCode: string;
  studentName: string;
  currentScore: string;
  proposedScore: string;
  proposedAttendance?: number | null;
  proposedMidterm?: number | null;
  proposedFinal?: number | null;
  reason: string;
  evidenceAttachment?: string | null;
  requestedBy: string;
  requestedAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
}

export interface NotificationItem {
  id: number;
  title: string;
  content: string;
  category: string;
  isRead: boolean;
  targetRole?: string | null;
  createdAt: string;
}

export interface StudentTranscriptItem {
  offeringId?: number;
  offeringCode: string;
  courseCode: string;
  courseName: string;
  credits: number;
  semesterCode?: string;
  semesterName?: string;
  lecturerNames?: string;
  scoreId?: number | null;
  attendanceScore: number | null;
  midtermScore: number | null;
  finalScore: number | null;
  score: string | null;
  letterScore: string | null;
  version: number | null;
  offeringStatus?: string;
  blockchainStatus: string;
  latestTxHash: string | null;
  recordKey: string | null;
  integrityResult?: string;
}

export interface DashboardData {
  summary: {
    totalScores: number;
    validCount: number;
    invalidCount: number;
    pendingCount: number;
    errorCount: number;
  };
  recentTransactions: {
    id: number;
    scoreId: number;
    studentId: string;
    courseCode: string;
    version: number;
    action: string;
    score: string;
    transactionHash: string;
    blockNumber: string | null;
    timestamp: string;
  }[];
  recentAuditLogs: AuditLogItem[];
}

export interface AuditLogItem {
  id: number;
  actor: string;
  action: string;
  target: string;
  beforeData: string | null;
  afterData: string | null;
  ip: string | null;
  timestamp: string;
}

export interface LecturerItem {
  id: number;
  lecturerCode: string;
  fullName: string;
  faculty: string;
  email: string | null;
  username: string | null;
  teachingOfferingsCount: number;
  offerings?: { offeringCode: string; courseName: string }[];
  createdAt: string;
}

export interface StudentItem {
  id: number;
  studentCode: string;
  fullName: string;
  className: string;
  email: string | null;
  username: string | null;
  enrolledOfferingsCount: number;
  enrollments?: { offeringCode: string; courseName: string; score: string | null; status: string }[];
  createdAt: string;
}

export interface CourseItem {
  id: number;
  code: string;
  name: string;
  credits: number;
  department: string;
  _count?: { offerings: number };
}

export interface SemesterItem {
  id: number;
  code: string;
  name: string;
  isCurrent: boolean;
}

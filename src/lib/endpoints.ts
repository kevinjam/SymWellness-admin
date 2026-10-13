import { api, type Query } from './api';
import type {
  AdminMe,
  AppControls,
  Book,
  BookList,
  CampaignList,
  ControlsInput,
  DoctorFull,
  InsightFull,
  InsightInput,
  Testimonial,
  AuditList,
  BillingDetails,
  BugList,
  CatalogItem,
  CatalogType,
  CreatedUser,
  DeletePreview,
  ClinicList,
  DeletionList,
  DoctorList,
  InsightList,
  Overview,
  SubscriptionList,
  SupportList,
  Usage,
  UserDetail,
  UserInput,
  UserList,
} from './types';

/** One place that knows every backend path the console uses. */
export const admin = {
  me: () => api.get<AdminMe>('/api/admin/me'),
  overview: (signal?: AbortSignal) => api.get<Overview>('/api/admin/overview', undefined, signal),

  users: (q: Query, signal?: AbortSignal) => api.get<UserList>('/api/admin/users', q, signal),
  user: (id: string, signal?: AbortSignal) =>
    api.get<UserDetail>(`/api/admin/users/${id}`, undefined, signal),
  setUserStatus: (id: string, isActive: boolean, reason?: string) =>
    api.put<{ id: string; isActive: boolean }>(`/api/admin/users/${id}/status`, { isActive, reason }),

  // Super admin only (enforced server side too).
  createUser: (input: UserInput) => api.post<CreatedUser>('/api/admin/users', input),
  updateUser: (id: string, input: Partial<UserInput>) =>
    api.put<{ id: string }>(`/api/admin/users/${id}`, input),
  resetPassword: (id: string, password?: string) =>
    api.put<{ id: string; temporaryPassword: string | null }>(`/api/admin/users/${id}/password`, { password }),
  deletePreview: (id: string, signal?: AbortSignal) =>
    api.get<DeletePreview>(`/api/admin/users/${id}/delete-preview`, undefined, signal),
  deleteUser: (id: string, confirm: string, cancelSubscription: boolean) =>
    api.del<{ id: string }>(`/api/admin/users/${id}`, { confirm, cancelSubscription }),

  billing: (userId: string, signal?: AbortSignal) =>
    api.get<BillingDetails>(`/api/admin/users/${userId}/billing`, undefined, signal),
  subscriptions: (q: Query, signal?: AbortSignal) =>
    api.get<SubscriptionList>('/api/admin/subscriptions', q, signal),
  usage: (days: number, signal?: AbortSignal) =>
    api.get<Usage>('/api/admin/usage', { days }, signal),

  deletionRequests: (q: Query, signal?: AbortSignal) =>
    api.get<DeletionList>('/api/admin/deletion-requests', q, signal),
  updateDeletionRequest: (id: string, status: string, notes?: string) =>
    api.put(`/api/admin/deletion-requests/${id}`, { status, notes }),
  auditLogs: (q: Query, signal?: AbortSignal) =>
    api.get<AuditList>('/api/admin/audit-logs', q, signal),

  catalog: (type: CatalogType, signal?: AbortSignal) =>
    api.get<{ items: CatalogItem[]; total: number }>(`/api/admin/catalog/${type}`, undefined, signal),
  createCatalogItem: (type: CatalogType, body: Record<string, unknown>) =>
    api.post<{ id: string }>(`/api/admin/catalog/${type}`, body),
  updateCatalogItem: (type: CatalogType, id: string, body: Record<string, unknown>) =>
    api.put(`/api/admin/catalog/${type}/${id}`, body),
  deleteCatalogItem: (type: CatalogType, id: string) =>
    api.del(`/api/admin/catalog/${type}/${id}`),

  doctors: (q: Query, signal?: AbortSignal) => api.get<DoctorList>('/api/admin/doctors', q, signal),
  setDoctorStatus: (id: string, isActive: boolean) =>
    api.put(`/api/admin/doctors/${id}/status`, { isActive }),
  clinics: (q: Query, signal?: AbortSignal) => api.get<ClinicList>('/api/admin/clinics', q, signal),

  insights: (q: Query, signal?: AbortSignal) =>
    api.get<InsightList>('/api/admin/insights', q, signal),
  setInsightStatus: (id: string, isActive: boolean) =>
    api.put(`/api/admin/insights/${id}/status`, { isActive }),

  insight: (id: string, signal?: AbortSignal) =>
    api.get<InsightFull>(`/api/admin/insights/${id}`, undefined, signal),
  createInsight: (input: Partial<InsightInput> & { title: string }) =>
    api.post<{ id: string }>('/api/admin/insights', input),
  updateInsight: (id: string, input: Partial<InsightInput>) =>
    api.put<{ id: string }>(`/api/admin/insights/${id}`, input),

  testimonial: (signal?: AbortSignal) =>
    api.get<Testimonial>('/api/admin/content/testimonial', undefined, signal),
  saveTestimonial: (input: Omit<Testimonial, 'exists'>) =>
    api.put<{ saved: boolean }>('/api/admin/content/testimonial', input),

  books: (q: Query, signal?: AbortSignal) => api.get<BookList>('/api/admin/books', q, signal),
  saveBook: (id: string | null, input: Partial<Book>) =>
    id ? api.put<{ id: string }>(`/api/admin/books/${id}`, input) : api.post<{ id: string }>('/api/admin/books', input),
  deleteBook: (id: string) => api.del<{ id: string }>(`/api/admin/books/${id}`),

  doctor: (id: string, signal?: AbortSignal) =>
    api.get<DoctorFull>(`/api/admin/doctors/${id}`, undefined, signal),
  saveDoctor: (id: string | null, input: Partial<DoctorFull>) =>
    id ? api.put<{ id: string }>(`/api/admin/doctors/${id}`, input) : api.post<{ id: string }>('/api/admin/doctors', input),

  // App controls, notifications and complimentary access (super admin writes).
  controls: (signal?: AbortSignal) => api.get<AppControls>('/api/admin/config', undefined, signal),
  saveControls: (input: ControlsInput) => api.put<AppControls>('/api/admin/config', input),

  campaigns: (q: Query, signal?: AbortSignal) =>
    api.get<CampaignList>('/api/admin/notifications', q, signal),
  audience: (segment: string, signal?: AbortSignal) =>
    api.get<{ segment: string; count: number; configured: boolean }>(
      '/api/admin/notifications/audience',
      { segment },
      signal
    ),
  broadcast: (input: { segment: string; title: string; body: string }) =>
    api.post<{ id: string; audienceCount: number }>('/api/admin/notifications', input),
  notifyUser: (id: string, input: { title: string; body: string }) =>
    api.post<{ sent: boolean }>(`/api/admin/users/${id}/notify`, input),
  setComplimentary: (id: string, input: { enabled: boolean; reason?: string; expiresAt?: string | null }) =>
    api.put<{ id: string; enabled: boolean }>(`/api/admin/users/${id}/complimentary`, input),

  // Existing backend endpoints (already admin-protected server side).
  supportMessages: (q: Query, signal?: AbortSignal) =>
    api.get<SupportList>('/api/support/admin/messages', q, signal),
  updateSupportMessage: (id: string, body: { status?: string; adminResponse?: string }) =>
    api.put(`/api/support/admin/messages/${id}`, body),
  bugReports: (q: Query, signal?: AbortSignal) =>
    api.get<BugList>('/api/bug-report/admin/reports', q, signal),
  updateBugReport: (id: string, body: { status?: string; priority?: string; adminResponse?: string }) =>
    api.put(`/api/bug-report/admin/reports/${id}`, body),
};

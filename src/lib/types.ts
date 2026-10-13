/** Response shapes of the SymWellness backend `/api/admin/*` endpoints. */

export interface Paged {
  total: number;
  page: number;
  pages: number;
}

export interface AdminMe {
  id: string;
  name: string;
  email: string;
  role: string;
  /** Can create, edit and delete users. Enforced again on the server. */
  isSuperAdmin: boolean;
  lastLogin: string | null;
}

export interface SubscriptionSummary {
  plan: string;
  status: 'free' | 'trial' | 'active' | 'expired' | 'cancelled' | string;
  hasPremium: boolean;
  isOnTrial: boolean;
  willRenew?: boolean;
  expiresAt: string | null;
  price?: number;
  cycle?: string;
  stripeCustomerId?: string | null;
}

export interface Overview {
  users: {
    total: number;
    new7d: number;
    new30d: number;
    active7d: number;
    onboardingCompleted: number;
    byRole: Record<string, number>;
    byProvider: Record<string, number>;
  };
  subscriptions: {
    premium: number;
    trialing: number;
    paying: number;
    byStatus: Record<string, number>;
    plans: Array<{ plan: string; subscribers: number; mrr: number }>;
    mrr: number;
    arr: number;
    conversionPct: number;
  };
  support: {
    openMessages: number;
    openBugReports: number;
    pendingDeletionRequests: number;
  };
  signupsByDay: Array<{ date: string; count: number }>;
  generatedAt: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  provider: string;
  role: 'patient' | 'doctor' | 'admin';
  isSuperAdmin: boolean;
  isActive: boolean;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  termsAccepted: boolean;
  createdAt: string | null;
  lastLogin: string | null;
  subscription: SubscriptionSummary;
}

export interface UserList extends Paged {
  users: AdminUser[];
}

export interface UserDetail extends AdminUser {
  phoneNumber: string;
  /** True when the user has a registered device that can receive push. */
  pushReachable: boolean;
  complimentary: {
    active: boolean;
    reason: string;
    grantedAt: string | null;
    expiresAt: string | null;
  };
  termsAcceptedAt: string | null;
  termsAcceptedVersion: string | null;
  activity: {
    medications: number;
    symptoms: number;
    thesisMessages: number;
    calorieScans: number;
    scans: number;
    reports: number;
  };
  support: { messages: number; bugReports: number };
}

export interface SubscriptionRow extends SubscriptionSummary {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  stripeSubscriptionId: string | null;
  lastSyncedAt: string | null;
  updatedAt: string | null;
}

export interface SubscriptionList extends Paged {
  subscriptions: SubscriptionRow[];
}

export interface UsageFeature {
  key: string;
  label: string;
  total: number;
  series: Array<{ date: string; count: number }>;
}

export interface Usage {
  days: number;
  features: UsageFeature[];
  topUsers: Array<{ userId: string; name: string; email: string; plan: string; messages: number }>;
  generatedAt: string;
}

export interface DeletionRequest {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  requestedAt: string;
  completedAt: string | null;
  source: string;
  notes: string;
}

export interface DeletionList extends Paged {
  requests: DeletionRequest[];
}

export interface AuditLog {
  id: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  meta: Record<string, unknown> | null;
  ipAddress: string;
  createdAt: string;
}

export interface AuditList extends Paged {
  logs: AuditLog[];
}

export type CatalogType = 'categories' | 'dosage-forms' | 'faqs';

export interface CatalogItem {
  id: string;
  isActive?: boolean;
  [key: string]: unknown;
}

export interface Doctor {
  id: string;
  name: string;
  email: string;
  specialty: string;
  licenseNumber: string;
  organization: string;
  city: string;
  state: string;
  rating: number;
  reviews: number;
  isActive: boolean;
  createdAt: string | null;
}

export interface DoctorList extends Paged {
  doctors: Doctor[];
}

export interface Clinic {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  type: string;
  rating: number;
  acceptingNewPatients: boolean;
}

export interface ClinicList extends Paged {
  clinics: Clinic[];
}

export interface Insight {
  id: string;
  slug: string;
  category: string;
  tag: string;
  title: string;
  hook: string;
  source: string;
  isActive: boolean;
  weight: number;
  createdAt: string | null;
}

export interface InsightList extends Paged {
  insights: Insight[];
  categories: Array<{ id: string; label: string }>;
}

/** Support inbox (existing endpoints under /api/support/admin and /api/bug-report/admin). */
export interface PopulatedUser {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface SupportMessage {
  _id: string;
  userId?: PopulatedUser | string | null;
  category: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  userEmail?: string;
  userFullName?: string;
  adminResponse?: string;
  adminRespondedAt?: string;
  createdAt: string;
}

export interface SupportList {
  messages: SupportMessage[];
  total: number;
  page: number;
  pages: number;
}

export interface BugReport {
  _id: string;
  category: string;
  title?: string;
  description?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'duplicate';
  priority: 'low' | 'medium' | 'high' | 'critical';
  userEmail?: string;
  userFullName?: string;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  adminResponse?: string;
  createdAt: string;
  deviceInfo?: Record<string, unknown>;
  appVersion?: string;
}

export interface BugList {
  reports: BugReport[];
  total: number;
  page: number;
  pages: number;
}

export interface BillingInvoice {
  id: string;
  number: string;
  status: 'paid' | 'open' | 'draft' | 'void' | 'uncollectible' | string;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  createdAt: string | null;
  paidAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  description: string;
}

export interface BillingDetails {
  /** False when the user has never started a Stripe checkout. */
  connected: boolean;
  customerId: string | null;
  subscriptionId: string | null;
  planTitle?: string;
  priceString?: string | null;
  priceAmount?: number | null;
  priceCurrency?: string;
  priceInterval?: string | null;
  status?: string;
  hasPremium?: boolean;
  isOnTrial?: boolean;
  willRenew?: boolean;
  cancelAtPeriodEnd?: boolean;
  expirationDate?: string | null;
  paymentMethod?: { brand: string; last4: string; expMonth: number | null; expYear: number | null } | null;
  invoices?: BillingInvoice[];
}

export type AdminRole = 'patient' | 'doctor' | 'admin';

export interface UserInput {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: AdminRole;
  password?: string;
}

export interface CreatedUser {
  id: string;
  email: string;
  role: AdminRole;
  /** Shown once. Only present when the server generated the password. */
  temporaryPassword: string | null;
}

export interface DeletePreview {
  id: string;
  name: string;
  email: string;
  role: string;
  deletable: boolean;
  blockedReason: string | null;
  activeSubscription: boolean;
  items: Array<{ key: string; label: string; count: number }>;
  total: number;
}

/* ------------------------------------------------------------ Controls */

export interface FeatureSwitch {
  key: string;
  label: string;
  note: string;
  paid: boolean;
  enabled: boolean;
  message: string;
}

export interface AppControls {
  maintenance: { enabled: boolean; message: string };
  features: FeatureSwitch[];
  updatedAt: string | null;
}

export interface ControlsInput {
  maintenance?: { enabled?: boolean; message?: string };
  features?: Record<string, { enabled?: boolean; message?: string }>;
}

/* ------------------------------------------------------- Notifications */

export interface AudienceSegment {
  key: string;
  label: string;
  hint: string;
}

export interface Campaign {
  id: string;
  title: string;
  body: string;
  segment: string;
  kind: 'broadcast' | 'direct' | 'test';
  audienceCount: number;
  sent: number;
  failed: number;
  status: 'sending' | 'sent' | 'partial' | 'failed';
  error: string;
  createdByEmail: string;
  createdAt: string;
  completedAt: string | null;
}

export interface CampaignList extends Paged {
  campaigns: Campaign[];
  segments: AudienceSegment[];
  configured: boolean;
}

/* ------------------------------------------------------------- Content */

export interface InsightFull {
  id: string;
  slug: string;
  category: string;
  tag: string;
  title: string;
  hook: string;
  why: string;
  tip: string;
  sections: Array<{ label: string; body: string }>;
  imageUrl: string | null;
  detailImageUrl: string | null;
  source: string;
  sourceNote: string | null;
  isActive: boolean;
  weight: number;
  categories: string[];
}

export interface InsightInput {
  category: string;
  tag: string;
  title: string;
  hook: string;
  why: string;
  tip: string;
  sections: Array<{ label: string; body: string }>;
  imageUrl: string | null;
  detailImageUrl: string | null;
  sourceNote: string | null;
  isActive: boolean;
  weight: number;
}

export interface Testimonial {
  quoteHighlight: string;
  quoteBody: string;
  authorName: string;
  authorTitle: string;
  authorImageUrl: string;
  active: boolean;
  exists: boolean;
}

export interface Book {
  id: string;
  bookId: string;
  title: string;
  author: string;
  topic: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  readingTimeMinutes: number;
  summary: string;
  whyRecommended: string;
  keyLessons: string[];
  mindfulnessInsight: string;
  concepts: string[];
  historicalRelevance: string;
  coverUrl: string;
  isbn: string;
  sortOrder: number;
  published: boolean;
}

export interface BookList extends Paged {
  books: Book[];
}

export interface DoctorFull {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  specialty: string;
  subSpecialty: string;
  licenseNumber: string;
  yearsOfExperience: number;
  hospitalName: string;
  clinicName: string;
  bio: string;
  consultationFee: number;
  isActive: boolean;
  acceptsNewPatients: boolean;
  profilePicture: string;
  address: { street?: string; city?: string; state?: string; zipCode?: string; country?: string };
  availableHours: { start?: string; end?: string };
}

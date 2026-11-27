// ─── Enums / Unions ──────────────────────────────────────────────────────────

export type BenefitCategory =
  | 'Education'
  | 'Healthcare'
  | 'Housing'
  | 'Employment'
  | 'Financial Aid'
  | 'Disability'
  | 'Family Support'
  | 'Skill Development';

export type EligibilityStatus =
  | 'eligible'
  | 'potentially_eligible'
  | 'not_eligible'
  | 'more_info_needed';

export type DocumentStatus = 'verified' | 'missing' | 'needs_review' | 'expired' | 'not_assessed';

export type ApplicationStatus =
  | 'saved'
  | 'preparation'
  | 'ready_to_apply'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected';

export type NotificationType =
  | 'deadline'
  | 'document'
  | 'profile'
  | 'application'
  | 'new_benefit';

// ─── Core Models ─────────────────────────────────────────────────────────────

export interface EligibilityRequirement {
  id: string;
  field?: string;
  operator?: string;
  label: string;
  userValue?: string;
  requiredValue?: string;
  met: boolean | null; // null = unknown / info needed
  detail?: string;
  mandatory?: boolean;
}

export interface EligibilityAssessment {
  result: 'Appears Eligible Based on Provided Information' | 'More Information Required' | 'Does Not Meet a Mandatory Condition';
  eligibilityStatus: EligibilityStatus;
  requirements: EligibilityRequirement[];
  disclaimer: string;
}

export interface RequiredDocument {
  name: string;
  status: DocumentStatus;
  description?: string;
}

export interface ApplicationStep {
  number: number;
  title: string;
  description: string;
}

export interface Benefit {
  id: string;
  schemeId?: string;
  name: string;
  category: BenefitCategory;
  description: string;
  matchScore: number;
  eligibilityStatus: EligibilityStatus;
  amount?: string;
  deadline?: string;
  daysRemaining?: number;
  requirements: EligibilityRequirement[];
  requiredDocuments: RequiredDocument[];
  applicationStatus: ApplicationStatus;
  officialSource: string;
  provider?: string;
  state?: string;
  educationLevel?: string;
  incomeLimit?: string;
  categoryCriteria?: string;
  locationCriteria?: string;
  requiredDocumentsNote?: string;
  applicationStatusLabel?: 'Open' | 'Closed' | 'Upcoming' | 'Status Not Confirmed';
  applicationStatusNote?: string;
  officialUrl: string;
  applicationUrl?: string;
  aboutText: string;
  whoCanApply: string;
  whyYouQualify: string;
  applicationSteps: ApplicationStep[];
  importantDates: { label: string; date: string }[];
  tags: string[];
  isSaved: boolean;
  lastUpdated: string;
  verifiedData?: boolean;
  recommendationReasons?: string[];
  eligibilityResult?: EligibilityAssessment['result'];
}

export interface Document {
  id: string;
  name: string;
  type: string;
  uploadedDate: string;
  status: DocumentStatus;
  expiryDate?: string;
  fileSize?: string;
  usedIn?: string[];
}

export interface Deadline {
  id: string;
  benefitName: string;
  benefitId: string;
  type: string;
  date: string;
  daysRemaining: number;
  isCompleted: boolean;
}

export interface Application {
  id: string;
  benefitId: string;
  benefitName: string;
  category: BenefitCategory;
  appliedDate: string;
  lastUpdated: string;
  status: ApplicationStatus;
  nextAction: string;
  referenceNumber?: string;
  submissionDate?: string;
  notes?: string;
  history?: { status: ApplicationStatus; date: string }[];
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  date: string;
  isRead: boolean;
  actionLabel?: string;
  actionUrl?: string;
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  location: string;
  state: string;
  district: string;
  education: string;
  institution: string;
  course?: string;
  courseYear?: string;
  institutionType?: string;
  academicPercentage?: number;
  annualIncome?: number;
  income: string;
  employmentStatus: string;
  category: string;
  hasDisability: boolean;
  completionPercent: number;
  joinedDate: string;
  privacyConsent?: boolean;
}

export interface DashboardStats {
  potentialBenefits: number;
  highMatchOpportunities: number;
  documentsNeeded: number;
  upcomingDeadlines: number;
  eligibleBenefits: number;
  moreInfoRequired: number;
  savedBenefits: number;
  uploadedDocuments: number;
  applicationsInProgress: number;
}

export interface ProfileField {
  label: string;
  key: string;
  status: 'complete' | 'missing';
  value?: string;
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  category: string;
  readTime: string;
  date: string;
}

export interface AdminBenefit extends Benefit {
  adminStatus: 'draft' | 'under_review' | 'verified' | 'expired';
  addedBy: string;
  addedDate: string;
  verifiedBy?: string;
  verifiedDate?: string;
}

export interface AdminBenefitRecord extends Record<string, unknown> {
  id: string;
  name: string;
  verification_status: 'pending' | 'verified';
  official_url: string;
  official_source: string;
  eligibility_rules: Array<Record<string, unknown>>;
}

// ─── API Types ────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface SearchFilters {
  query?: string;
  category?: BenefitCategory | '';
  state?: string;
  education?: string;
  income?: string;
  ageMin?: number;
  ageMax?: number;
  deadline?: string;
  sort?: 'match' | 'deadline' | 'amount' | 'newest';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

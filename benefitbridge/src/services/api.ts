/**
 * API Service Layer
 *
 * All functions are structured to be replaced with real fetch() calls
 * to a FastAPI backend. The mock implementations simulate realistic
 * network latency and response shapes.
 *
 * Backend endpoints (FastAPI + MongoDB):
 *   POST   /auth/register
 *   POST   /auth/login
 *   GET    /profile
 *   PUT    /profile
 *   GET    /benefits
 *   GET    /benefits/:id
 *   POST   /eligibility/check
 *   GET    /recommendations
 *   POST   /documents
 *   GET    /documents
 *   GET    /applications
 *   POST   /applications
 *   GET    /deadlines
 *   GET    /notifications
 *   PUT    /notifications/:id/read
 *   GET    /resources
 *   GET    /admin/benefits
 *   POST   /admin/benefits
 *   PUT    /admin/benefits/:id
 */

import type {
  Benefit, Document, Deadline, Application,
  Notification, UserProfile, DashboardStats,
  SearchFilters, Resource, AdminBenefitRecord
} from '../types';
import type { EligibilityAssessment } from '../types';
import {
  mockBenefits, mockResources
} from '../data/mockData';
import {
  backendConfigured, backendDownload, backendRequest, clearBackendSession, saveBackendSession, hasDemoSession,
} from './backendClient';

const delay = (ms: number) => new Promise<void>(res => setTimeout(res, ms));
const storage = {
  get<T>(key: string, fallback: T): T {
    const value = localStorage.getItem(`benefitbridge:${key}`);
    return value ? JSON.parse(value) as T : fallback;
  },
  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(`benefitbridge:${key}`, JSON.stringify(value));
    } catch (error) {
      console.error(`Could not save ${key} to browser storage`, error);
      throw new Error('Your browser could not save this change. Check available storage and try again.');
    }
  },
};

const today = () => new Date().toISOString().slice(0, 10);
const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result ?? ''));
  reader.onerror = () => reject(new Error('Could not read the selected file.'));
  reader.readAsDataURL(file);
});
const formatDate = (date: Date) => date.toLocaleDateString('en-IN', {
  day: 'numeric', month: 'short', year: 'numeric',
});
type BackendBenefit = Record<string, unknown> & { id: string; name: string; category: Benefit['category']; description: string };
type BackendApplication = Record<string, unknown> & {
  id: string;
  benefit_id: string;
  benefit_name: string;
  category: Benefit['category'];
  status: string;
};

function mapBackendBenefit(value: BackendBenefit): Benefit {
  const requiredDocuments = Array.isArray(value.required_documents) ? value.required_documents as string[] : [];
  const conditions = Array.isArray(value.conditions)
    ? value.conditions as Array<Record<string, unknown>>
    : [];
  const recommendationReasons = Array.isArray(value.recommendation_reasons)
    ? value.recommendation_reasons.map(String)
    : [];
  return {
    id: value.id,
    schemeId: typeof value.scheme_id === 'string' ? value.scheme_id : undefined,
    name: value.name,
    category: value.category,
    description: value.description,
    matchScore: Number(value.recommendation_score ?? 0),
    eligibilityStatus: value.eligibility_status === 'eligible' ||
      value.eligibility_status === 'not_eligible' ||
      value.eligibility_status === 'potentially_eligible'
      ? value.eligibility_status
      : 'more_info_needed',
    requirements: conditions.map((condition, index) => ({
      id: `rule-${index}`,
      field: typeof condition.field === 'string' ? condition.field : undefined,
      operator: typeof condition.operator === 'string' ? condition.operator : undefined,
      label: String(condition.label ?? 'Eligibility condition'),
      userValue: condition.user_value === null || condition.user_value === undefined ? undefined : String(condition.user_value),
      requiredValue: Array.isArray(condition.required_value)
        ? condition.required_value.join(', ')
        : condition.required_value === undefined ? undefined : String(condition.required_value),
      met: condition.met === true ? true : condition.met === false ? false : null,
      detail: typeof condition.reason === 'string' ? condition.reason : undefined,
      mandatory: Boolean(condition.mandatory),
    })),
    requiredDocuments: requiredDocuments.map(name => ({ name, status: 'not_assessed' })),
    applicationStatus: 'saved',
    officialSource: String(value.official_source ?? ''),
    provider: typeof value.official_department === 'string' ? value.official_department : undefined,
    state: typeof value.state === 'string' ? value.state : undefined,
    educationLevel: typeof value.education_level === 'string' ? value.education_level : undefined,
    incomeLimit: typeof value.income_limit === 'string' ? value.income_limit : undefined,
    categoryCriteria: typeof value.category_criteria === 'string' ? value.category_criteria : undefined,
    locationCriteria: typeof value.location_criteria === 'string' ? value.location_criteria : undefined,
    requiredDocumentsNote: typeof value.required_documents_note === 'string' ? value.required_documents_note : undefined,
    applicationStatusLabel: value.application_status === 'Open' ||
      value.application_status === 'Closed' ||
      value.application_status === 'Upcoming'
      ? value.application_status
      : 'Status Not Confirmed',
    applicationStatusNote: typeof value.application_status_note === 'string' ? value.application_status_note : undefined,
    officialUrl: String(value.official_source_url ?? value.official_info_url ?? value.official_url ?? ''),
    applicationUrl: typeof value.official_application_url === 'string'
      ? value.official_application_url
      : typeof value.application_url === 'string' ? value.application_url : undefined,
    amount: typeof value.benefit_amount === 'string' ? value.benefit_amount : undefined,
    aboutText: String(value.benefit_summary ?? value.description),
    whoCanApply: String(value.eligibility_summary ?? ''),
    whyYouQualify: recommendationReasons.join(' '),
    applicationSteps: [],
    importantDates: [
      ...(typeof value.application_open_date === 'string'
        ? [{ label: 'Application opens', date: value.application_open_date }]
        : []),
      ...(typeof value.deadline === 'string'
        ? [{ label: 'Application deadline', date: value.deadline }]
        : []),
    ],
    tags: Array.isArray(value.tags) ? value.tags.map(String) : [],
    lastUpdated: String(value.last_verified_date ?? value.last_verified_at ?? ''),
    verifiedData: value.verification_status === 'verified',
    deadline: typeof value.application_deadline === 'string'
      ? value.application_deadline
      : typeof value.deadline === 'string' ? value.deadline : undefined,
    isSaved: Boolean(value.is_saved),
    recommendationReasons,
    eligibilityResult: typeof value.eligibility_result === 'string'
      ? value.eligibility_result as Benefit['eligibilityResult']
      : undefined,
  };
}

const normalizeDocumentType = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

export function applyDocumentReadiness(benefit: Benefit, documents: Document[]): Benefit {
  return {
    ...benefit,
    requiredDocuments: benefit.requiredDocuments.map(required => {
      const uploaded = documents.find(document =>
        normalizeDocumentType(document.type) === normalizeDocumentType(required.name) ||
        normalizeDocumentType(document.name) === normalizeDocumentType(required.name),
      );
      return {
        ...required,
        status: uploaded
          ? uploaded.status === 'verified'
            ? 'verified'
            : uploaded.status === 'expired'
              ? 'expired'
              : 'needs_review'
          : 'missing',
      };
    }),
  };
}

function toApplicationStatus(status: string): Application['status'] {
  const statuses: Record<string, Application['status']> = {
    not_started: 'saved',
    preparing_documents: 'preparation',
    ready_to_apply: 'ready_to_apply',
    applied: 'submitted',
    under_review: 'under_review',
    approved: 'approved',
    rejected: 'rejected',
  };
  return statuses[status] ?? 'saved';
}

function fromApplicationStatus(status: Application['status']): string {
  const statuses: Record<Application['status'], string> = {
    saved: 'not_started',
    preparation: 'preparing_documents',
    ready_to_apply: 'ready_to_apply',
    submitted: 'applied',
    under_review: 'under_review',
    approved: 'approved',
    rejected: 'rejected',
  };
  return statuses[status];
}

function mapBackendApplication(value: BackendApplication): Application {
  return {
    id: value.id,
    benefitId: value.benefit_id,
    benefitName: value.benefit_name,
    category: value.category,
    appliedDate: String(value.created_at ?? ''),
    lastUpdated: String(value.updated_at ?? ''),
    status: toApplicationStatus(value.status),
    nextAction: value.status === 'ready_to_apply' ? 'Open the official application portal' : 'Update your progress using the official scheme portal',
    referenceNumber: typeof value.reference_number === 'string' ? value.reference_number : undefined,
    submissionDate: typeof value.submission_date === 'string' ? value.submission_date : undefined,
    notes: typeof value.notes === 'string' ? value.notes : undefined,
    history: Array.isArray(value.history) ? value.history as Application['history'] : [],
  };
}

const readBenefits = () => {
  const saved = new Set(storage.get<string[]>('saved-benefits', []));
  const profile = storage.get<UserProfile | null>('profile', null);
  const documents = storage.get<Document[]>('documents', []);
  const normalizeDocumentType = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  return mockBenefits.map(benefit => {
    const userValues: Record<string, string | undefined> = {
      Age: profile?.age ? `${profile.age} years` : undefined,
      'Education level': profile?.education,
      Education: profile?.education,
      'Annual household income': profile?.income,
      'Annual parental income': profile?.income,
      'Community category': profile?.category || undefined,
      Location: profile?.location || undefined,
      State: profile?.state || undefined,
    };
    return {
      ...benefit,
      verifiedData: false,
      eligibilityStatus: 'more_info_needed' as const,
      matchScore: 0,
      deadline: undefined,
      daysRemaining: undefined,
      importantDates: [],
      requirements: benefit.requirements.map(requirement => ({
        ...requirement,
        userValue: userValues[requirement.label],
        met: null,
        detail: 'This example does not have verified scheme rules, so it has not been assessed.',
      })),
      whyYouQualify: 'No verified assessment is available for this illustrative catalogue record.',
      requiredDocuments: benefit.requiredDocuments.map(document => ({
        ...document,
        status: documents.some(uploaded => normalizeDocumentType(uploaded.type) === normalizeDocumentType(document.name))
          ? 'needs_review' as const
          : 'missing' as const,
      })),
      isSaved: saved.has(benefit.id),
    };
  });
};

const readProfileFields = (profile: UserProfile | null) => {
  const fields = [
    { key: 'name', label: 'Personal information', complete: Boolean(profile?.firstName && profile.lastName) },
    { key: 'education', label: 'Education', complete: Boolean(profile?.education) },
    { key: 'income', label: 'Household income', complete: Boolean(profile?.income) },
    { key: 'location', label: 'Location', complete: Boolean(profile?.state) },
  ];
  return fields.map(field => ({
    key: field.key,
    label: field.label,
    status: field.complete ? 'complete' as const : 'missing' as const,
  }));
};

const profileCompletion = (profile: Partial<UserProfile>) => {
  const checks = [profile.firstName, profile.lastName, profile.age, profile.education, profile.income, profile.state];
  return Math.round(checks.filter(Boolean).length / checks.length * 100);
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  async register(data: { email: string; password: string; firstName: string; lastName: string }) {
    if (!backendConfigured) throw new Error('Account registration is unavailable until the secure backend is configured.');
    const result = await backendRequest<{ access_token: string; user: Record<string, string> }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        first_name: data.firstName,
        last_name: data.lastName,
      }),
    }, false);
    await saveBackendSession(result);
    return { token: result.access_token, user: result.user };
  },

  async login(data: { email: string; password: string }) {
    if (!backendConfigured) throw new Error('Sign-in is unavailable until the secure backend is configured.');
    const result = await backendRequest<{ access_token: string; user: Record<string, string> }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false);
    await saveBackendSession(result);
    return { token: result.access_token, user: result.user };
  },

  async logout() {
    clearBackendSession();
  },
};

// ─── Profile ──────────────────────────────────────────────────────────────────

export const profileApi = {
  async get(): Promise<UserProfile | null> {
    if (hasDemoSession()) return storage.get<UserProfile | null>('profile', null);
    if (backendConfigured) {
      const value = await backendRequest<Record<string, unknown> | null>('/profile');
      if (!value) return null;
      const profile: UserProfile = {
        id: String(value.user_id ?? ''),
        firstName: String(value.first_name ?? ''),
        lastName: String(value.last_name ?? ''),
        age: Number(value.age ?? 0),
        gender: String(value.gender ?? ''),
        location: [value.district, value.state].filter(Boolean).join(', '),
        state: String(value.state ?? ''),
        district: String(value.district ?? ''),
        education: String(value.education ?? ''),
        institution: String(value.institution ?? ''),
        course: String(value.course ?? ''),
        courseYear: String(value.course_year ?? ''),
        institutionType: String(value.institution_type ?? ''),
        academicPercentage: value.academic_percentage == null ? undefined : Number(value.academic_percentage),
        annualIncome: value.annual_income == null ? undefined : Number(value.annual_income),
        income: String(value.income_range ?? ''),
        employmentStatus: String(value.employment_status ?? ''),
        category: String(value.community_category ?? ''),
        hasDisability: Boolean(value.has_disability),
        completionPercent: 0,
        joinedDate: String(value.created_at ?? ''),
        privacyConsent: Boolean(value.privacy_consent),
      };
      profile.completionPercent = profileCompletion(profile);
      return profile;
    }
    await delay(100);
    return storage.get<UserProfile | null>('profile', null);
  },

  async update(data: Partial<UserProfile>): Promise<UserProfile> {
    if (hasDemoSession()) {
      const current = storage.get<UserProfile | null>('profile', null);
      const profile = {
        ...(current ?? {
          id: 'demo-student',
          firstName: 'Demo',
          lastName: 'Student',
          age: 0,
          gender: '',
          location: '',
          state: '',
          district: '',
          education: '',
          institution: '',
          income: '',
          employmentStatus: '',
          category: '',
          hasDisability: false,
          completionPercent: 0,
          joinedDate: formatDate(new Date()),
        }),
        ...data,
      };
      profile.completionPercent = profileCompletion(profile);
      profile.location = [profile.district, profile.state].filter(Boolean).join(', ');
      storage.set('profile', profile);
      return profile;
    }
    if (backendConfigured) {
      const value = await backendRequest<Record<string, unknown>>('/profile', {
        method: 'PUT',
        body: JSON.stringify({
          first_name: data.firstName,
          last_name: data.lastName,
          age: data.age || null,
          gender: data.gender || null,
          state: data.state || null,
          district: data.district || null,
          education: data.education || null,
          institution: data.institution || null,
          course: data.course || null,
          course_year: data.courseYear || null,
          institution_type: data.institutionType || null,
          academic_percentage: data.academicPercentage ?? null,
          annual_income: data.annualIncome ?? null,
          income_range: data.income || null,
          employment_status: data.employmentStatus || null,
          community_category: data.category || null,
          has_disability: data.hasDisability ?? null,
          privacy_consent: Boolean(data.privacyConsent),
        }),
      });
      const updatedProfile: UserProfile = {
        id: String(value.user_id ?? ''),
        firstName: String(value.first_name ?? ''),
        lastName: String(value.last_name ?? ''),
        age: Number(value.age ?? 0),
        gender: String(value.gender ?? ''),
        location: [value.district, value.state].filter(Boolean).join(', '),
        state: String(value.state ?? ''),
        district: String(value.district ?? ''),
        education: String(value.education ?? ''),
        institution: String(value.institution ?? ''),
        course: String(value.course ?? ''),
        courseYear: String(value.course_year ?? ''),
        institutionType: String(value.institution_type ?? ''),
        academicPercentage: value.academic_percentage == null ? undefined : Number(value.academic_percentage),
        annualIncome: value.annual_income == null ? undefined : Number(value.annual_income),
        income: String(value.income_range ?? ''),
        employmentStatus: String(value.employment_status ?? ''),
        category: String(value.community_category ?? ''),
        hasDisability: Boolean(value.has_disability),
        completionPercent: 0,
        joinedDate: String(value.created_at ?? ''),
        privacyConsent: Boolean(value.privacy_consent),
      };
      updatedProfile.completionPercent = profileCompletion(updatedProfile);
      return updatedProfile;
    }
    await delay(100);
    const current = storage.get<UserProfile | null>('profile', null);
    const profile = {
      ...(current ?? {
        id: crypto.randomUUID(),
        firstName: '',
        lastName: '',
        age: 0,
        gender: '',
        location: '',
        state: '',
        district: '',
        education: '',
        institution: '',
        income: '',
        employmentStatus: '',
        category: '',
        hasDisability: false,
        completionPercent: 0,
        joinedDate: formatDate(new Date()),
      }),
      ...data,
    };
    profile.completionPercent = profileCompletion(profile);
    profile.location = [profile.district, profile.state].filter(Boolean).join(', ');
    storage.set('profile', profile);
    return profile;
  },

  async delete(): Promise<void> {
    if (backendConfigured) {
      await backendRequest<void>('/account', { method: 'DELETE' });
      clearBackendSession();
      return;
    }
    Object.keys(localStorage)
      .filter(key => key.startsWith('benefitbridge:'))
      .forEach(key => localStorage.removeItem(key));
  },
};

// ─── Benefits ─────────────────────────────────────────────────────────────────

export const benefitsApi = {
  async getAll(filters?: SearchFilters): Promise<Benefit[]> {
    if (backendConfigured) {
      const params = new URLSearchParams();
      if (filters?.query) params.set('q', filters.query);
      if (filters?.category) params.set('category', filters.category);
      if (filters?.state) params.set('state', filters.state);
      if (filters?.education) params.set('education', filters.education);
      if (filters?.sort) params.set('sort', filters.sort);
      const values = await backendRequest<BackendBenefit[]>(`/benefits${params.size ? `?${params}` : ''}`, {}, !hasDemoSession());
      const savedIds = new Set(storage.get<string[]>('saved-benefits', []));
      const results = values.map(value => ({
        ...mapBackendBenefit(value),
        isSaved: savedIds.has(value.id),
      }));
      if (filters?.sort === 'deadline') {
        results.sort((a, b) => (a.deadline ?? '9999-12-31').localeCompare(b.deadline ?? '9999-12-31'));
      } else if (filters?.sort === 'newest') {
        results.sort((a, b) => (b.lastUpdated ?? '').localeCompare(a.lastUpdated ?? ''));
      }
      return results;
    }
    await delay(600);
    let results = readBenefits();

    if (filters?.query) {
      const q = filters.query.toLowerCase();
      results = results.filter(b =>
        b.name.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q) ||
        b.tags.some(t => t.includes(q))
      );
    }

    if (filters?.category) {
      results = results.filter(b => b.category === filters.category);
    }
    if (filters?.state) {
      results = results.filter(b => b.tags.some(tag => tag.toLowerCase().includes(filters.state!.toLowerCase())));
    }
    if (filters?.education) {
      results = results.filter(b => b.tags.some(tag => tag.toLowerCase().includes(filters.education!.toLowerCase())));
    }

    const sort = filters?.sort ?? 'match';
    results.sort((a, b) => {
      if (sort === 'match') return b.matchScore - a.matchScore;
      if (sort === 'deadline') return (a.daysRemaining ?? Number.MAX_SAFE_INTEGER) - (b.daysRemaining ?? Number.MAX_SAFE_INTEGER);
      return 0;
    });

    return results;
  },

  async getById(id: string): Promise<Benefit | null> {
    if (backendConfigured) {
      const value = await backendRequest<BackendBenefit>(`/benefits/${encodeURIComponent(id)}`);
      return mapBackendBenefit(value);
    }
    await delay(400);
    return readBenefits().find(b => b.id === id) ?? null;
  },

  async getRecommendations(): Promise<Benefit[]> {
    if (backendConfigured) {
      if (hasDemoSession()) return [];
      const values = await backendRequest<BackendBenefit[]>('/recommendations');
      return values.map(mapBackendBenefit);
    }
    await delay(700);
    return [];
  },

  async saveForLater(id: string): Promise<void> {
    if (hasDemoSession()) {
      await delay(50);
      const saved = new Set(storage.get<string[]>('saved-benefits', []));
      saved.add(id);
      storage.set('saved-benefits', [...saved]);
      return;
    }
    if (backendConfigured) {
      await backendRequest<void>(`/benefits/${encodeURIComponent(id)}/save`, { method: 'POST' });
      return;
    }
    await delay(50);
    const saved = new Set(storage.get<string[]>('saved-benefits', []));
    saved.add(id);
    storage.set('saved-benefits', [...saved]);
  },

  async unsave(id: string): Promise<void> {
    if (hasDemoSession()) {
      await delay(50);
      const saved = new Set(storage.get<string[]>('saved-benefits', []));
      saved.delete(id);
      storage.set('saved-benefits', [...saved]);
      return;
    }
    if (backendConfigured) {
      await backendRequest<void>(`/benefits/${encodeURIComponent(id)}/save`, { method: 'DELETE' });
      return;
    }
    await delay(50);
    storage.set('saved-benefits', storage.get<string[]>('saved-benefits', []).filter(value => value !== id));
  },
};

// ─── Eligibility ──────────────────────────────────────────────────────────────

export const eligibilityApi = {
  async check(benefitId: string, profileData: Partial<UserProfile>): Promise<EligibilityAssessment> {
    if (backendConfigured) {
      void profileData;
      const result = await backendRequest<{
        result: EligibilityAssessment['result'];
        disclaimer: string;
        conditions: Array<{ field?: string; operator?: string; label: string; user_value: unknown; required_value: unknown; met: boolean | null; mandatory?: boolean; reason?: string }>;
      }>(
        `/eligibility/check/${encodeURIComponent(benefitId)}`,
        { method: 'POST' },
      );
      const requirements = result.conditions.map((condition, index) => ({
        id: `rule-${index}`,
        field: condition.field,
        operator: condition.operator,
        label: condition.label,
        userValue: condition.user_value === null || condition.user_value === undefined ? undefined : String(condition.user_value),
        requiredValue: Array.isArray(condition.required_value)
          ? condition.required_value.join(', ')
          : condition.required_value === null || condition.required_value === undefined
            ? undefined
            : String(condition.required_value),
        met: condition.met,
        mandatory: condition.mandatory,
        detail: condition.reason,
      }));
      return {
        result: result.result,
        eligibilityStatus: result.result === 'Appears Eligible Based on Provided Information' ? 'eligible' :
          result.result === 'Does Not Meet a Mandatory Condition' ? 'not_eligible' : 'more_info_needed',
        requirements,
        disclaimer: result.disclaimer,
      };
    }
    await delay(800);
    const benefit = readBenefits().find(b => b.id === benefitId);
    return {
      result: 'More Information Required',
      eligibilityStatus: 'more_info_needed',
      requirements: benefit?.requirements ?? [],
      disclaimer: 'Eligibility results are preliminary assessments based on the information provided. Final eligibility and approval are determined by the respective scheme authority.',
    };
  },
};

// ─── Documents ────────────────────────────────────────────────────────────────

export const documentsApi = {
  async getAll(): Promise<Document[]> {
    if (hasDemoSession()) return storage.get<Document[]>('documents', []);
    if (backendConfigured) {
      const values = await backendRequest<Array<Record<string, unknown>>>('/documents');
      return values.map(value => ({
        id: String(value.id),
        name: String(value.name),
        type: String(value.type),
        uploadedDate: String(value.uploaded_at ?? ''),
        status: 'needs_review',
        fileSize: `${Math.ceil(Number(value.size ?? 0) / 1024)} KB`,
      }));
    }
    await delay(50);
    return storage.get<Document[]>('documents', []);
  },

  async upload(file: File, type: string): Promise<Document> {
    if (hasDemoSession()) {
      const base64 = await fileToBase64(file);
      const document: Document & { dataUrl?: string; mimeType?: string } = {
        id: `demo-${crypto.randomUUID()}`,
        name: file.name,
        type,
        uploadedDate: today(),
        status: 'needs_review',
        fileSize: `${Math.max(1, Math.ceil(file.size / 1024))} KB`,
        dataUrl: base64,
        mimeType: file.type,
      };
      const documents = storage.get<Array<Document & { dataUrl?: string; mimeType?: string }>>('documents', []);
      storage.set('documents', [...documents, document]);
      return document;
    }
    if (backendConfigured) {
      const body = new FormData();
      body.append('file', file);
      const value = await backendRequest<Record<string, unknown>>(`/documents?document_type=${encodeURIComponent(type)}`, {
        method: 'POST',
        body,
      });
      return {
        id: String(value.id),
        name: String(value.name),
        type: String(value.type),
        uploadedDate: String(value.uploaded_at ?? ''),
        status: 'needs_review',
        fileSize: `${Math.ceil(Number(value.size ?? 0) / 1024)} KB`,
      };
    }
    await delay(50);
    const base64 = await fileToBase64(file);
    const document: Document & { dataUrl?: string; mimeType?: string } = {
      id: `demo-${crypto.randomUUID()}`,
      name: file.name,
      type,
      uploadedDate: today(),
      status: 'needs_review',
      fileSize: `${Math.max(1, Math.ceil(file.size / 1024))} KB`,
      dataUrl: base64,
      mimeType: file.type,
    };
    const documents = storage.get<Array<Document & { dataUrl?: string; mimeType?: string }>>('documents', []);
    storage.set('documents', [...documents, document]);
    return document;
  },

  async replace(id: string, file: File, type: string): Promise<Document> {
    if (hasDemoSession()) {
      const base64 = await fileToBase64(file);
      const documents = storage.get<Array<Document & { dataUrl?: string; mimeType?: string }>>('documents', []);
      const replacement: Document & { dataUrl?: string; mimeType?: string } = {
        id,
        name: file.name,
        type,
        uploadedDate: today(),
        status: 'needs_review',
        fileSize: `${Math.max(1, Math.ceil(file.size / 1024))} KB`,
        dataUrl: base64,
        mimeType: file.type,
      };
      storage.set('documents', documents.map(document => document.id === id ? replacement : document));
      return replacement;
    }
    if (!backendConfigured) throw new Error('Document replacement is unavailable in demo mode.');
    const body = new FormData();
    body.append('file', file);
    const value = await backendRequest<Record<string, unknown>>(
      `/documents/${encodeURIComponent(id)}?document_type=${encodeURIComponent(type)}`,
      { method: 'PUT', body },
    );
    return {
      id: String(value.id),
      name: String(value.name),
      type: String(value.type),
      uploadedDate: String(value.uploaded_at ?? ''),
      status: 'needs_review',
      fileSize: `${Math.ceil(Number(value.size ?? 0) / 1024)} KB`,
    };
  },

  async delete(id: string): Promise<void> {
    if (hasDemoSession()) {
      storage.set('documents', storage.get<Document[]>('documents', []).filter(doc => doc.id !== id));
      return;
    }
    if (backendConfigured) {
      await backendRequest<void>(`/documents/${encodeURIComponent(id)}`, { method: 'DELETE' });
      return;
    }
    await delay(50);
    storage.set('documents', storage.get<Document[]>('documents', []).filter(doc => doc.id !== id));
  },

  async download(id: string): Promise<Blob> {
    if (hasDemoSession()) {
      const document = storage.get<Array<Document & { dataUrl?: string; mimeType?: string }>>('documents', [])
        .find(item => item.id === id);
      if (!document?.dataUrl) throw new Error('The demo document content is unavailable.');
      const response = await fetch(document.dataUrl);
      return response.blob();
    }
    if (!backendConfigured) throw new Error('Document download is unavailable in demo mode.');
    return backendDownload(`/documents/${encodeURIComponent(id)}/download`);
  },
};

// ─── Applications ─────────────────────────────────────────────────────────────

export const applicationsApi = {
  async getAll(): Promise<Application[]> {
    if (hasDemoSession()) return storage.get<Application[]>('applications', []);
    if (backendConfigured) {
      const values = await backendRequest<BackendApplication[]>('/applications');
      return values.map(mapBackendApplication);
    }
    await delay(50);
    return storage.get<Application[]>('applications', []);
  },

  async start(benefitId: string): Promise<Application> {
    if (hasDemoSession()) {
      await delay(300);
      const applications = storage.get<Application[]>('applications', []);
      const existing = applications.find(application => application.benefitId === benefitId);
      if (existing) return existing;
      const benefit = (await benefitsApi.getAll()).find(item => item.id === benefitId);
      if (!benefit) throw new Error('The selected benefit could not be found.');
      const application: Application = {
        id: `demo-${benefitId}`,
        benefitId,
        benefitName: benefit.name,
        category: benefit.category,
        appliedDate: formatDate(new Date()),
        lastUpdated: formatDate(new Date()),
        status: 'preparation',
        nextAction: 'Gather required documents',
        history: [{ status: 'preparation', date: today() }],
      };
      storage.set('applications', [...applications, application]);
      return application;
    }
    if (backendConfigured) {
      const value = await backendRequest<BackendApplication>('/applications', {
        method: 'POST',
        body: JSON.stringify({ benefit_id: benefitId }),
      });
      return mapBackendApplication(value);
    }
    await delay(500);
    const benefit = readBenefits().find(b => b.id === benefitId);
    if (!benefit) throw new Error('The selected benefit could not be found.');
    const applications = storage.get<Application[]>('applications', []);
    const existing = applications.find(application => application.benefitId === benefitId);
    if (existing) return existing;
    const application: Application = {
      id: `a${Date.now()}`,
      benefitId,
      benefitName: benefit.name,
      category: benefit.category,
      appliedDate: formatDate(new Date()),
      lastUpdated: formatDate(new Date()),
      status: 'preparation',
      nextAction: 'Gather required documents',
      history: [{ status: 'preparation', date: today() }],
    };
    storage.set('applications', [...applications, application]);
    return application;
  },

  async update(id: string, data: Partial<Pick<Application, 'status' | 'referenceNumber' | 'submissionDate' | 'notes'>>): Promise<Application> {
    if (backendConfigured) {
      const payload = {
        ...(data.status ? { status: fromApplicationStatus(data.status) } : {}),
        ...(data.referenceNumber !== undefined ? { reference_number: data.referenceNumber } : {}),
        ...(data.submissionDate !== undefined ? { submission_date: data.submissionDate || null } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      };
      return mapBackendApplication(await backendRequest<BackendApplication>(`/applications/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }));
    }
    const applications = storage.get<Application[]>('applications', []);
    const existing = applications.find(application => application.id === id);
    if (!existing) throw new Error('Application not found.');
    const statusChanged = data.status && data.status !== existing.status;
    const updated: Application = {
      ...existing,
      ...data,
      lastUpdated: formatDate(new Date()),
      nextAction: data.status === 'ready_to_apply' ? 'Open the official application portal' :
        data.status === 'submitted' ? 'Keep your reference number and monitor the portal' :
        existing.nextAction,
      history: statusChanged
        ? [...(existing.history ?? []), { status: data.status!, date: today() }]
        : existing.history,
    };
    storage.set('applications', applications.map(application => application.id === id ? updated : application));
    return updated;
  },
};

// ─── Deadlines ────────────────────────────────────────────────────────────────

export const deadlinesApi = {
  async getAll(): Promise<Deadline[]> {
    if (hasDemoSession()) return [];
    if (backendConfigured) {
      const values = await backendRequest<Array<Record<string, unknown>>>('/deadlines');
      return values.map(value => ({
        id: String(value.benefit_id),
        benefitId: String(value.benefit_id),
        benefitName: String(value.benefit_name),
        type: 'Application deadline',
        date: String(value.date),
        daysRemaining: Number(value.days_remaining),
        isCompleted: false,
      }));
    }
    await delay(50);
    return [];
  },
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const notificationsApi = {
  async getAll(): Promise<Notification[]> {
    if (hasDemoSession()) return storage.get<Notification[]>('notifications', []);
    if (backendConfigured) {
      const values = await backendRequest<Array<Record<string, unknown>>>('/notifications');
      return values.map(value => ({
        id: String(value.id),
        type: value.type as Notification['type'],
        title: String(value.title ?? ''),
        message: String(value.message ?? ''),
        date: String(value.created_at ?? ''),
        isRead: Boolean(value.is_read),
        actionLabel: typeof value.action_label === 'string' ? value.action_label : undefined,
        actionUrl: typeof value.action_url === 'string' ? value.action_url : undefined,
      }));
    }
    await delay(50);
    return storage.get<Notification[]>('notifications', []);
  },

  async markRead(id: string): Promise<void> {
    if (backendConfigured) {
      await backendRequest<void>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PUT' });
      return;
    }
    storage.set('notifications', storage.get<Notification[]>('notifications', []).map(n => n.id === id ? { ...n, isRead: true } : n));
  },

  async markAllRead(): Promise<void> {
    if (backendConfigured) {
      await backendRequest<void>('/notifications/read-all', { method: 'PUT' });
      return;
    }
    storage.set('notifications', storage.get<Notification[]>('notifications', []).map(n => ({ ...n, isRead: true })));
  },

  async dismiss(id: string): Promise<void> {
    if (backendConfigured) {
      await backendRequest<void>(`/notifications/${encodeURIComponent(id)}`, { method: 'DELETE' });
      return;
    }
    storage.set('notifications', storage.get<Notification[]>('notifications', []).filter(n => n.id !== id));
  },
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardApi = {
  async getStats(): Promise<DashboardStats> {
    const [allBenefits, recommendations, documents, deadlines, applications] = await Promise.all([
      benefitsApi.getAll(),
      benefitsApi.getRecommendations(),
      documentsApi.getAll(),
      deadlinesApi.getAll(),
      applicationsApi.getAll(),
    ]);
    const normalizeType = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
    const availableTypes = new Set(documents.map(document => normalizeType(document.type)));
    const requiredTypes = new Set(
      allBenefits.flatMap(benefit => benefit.requiredDocuments.map(document => normalizeType(document.name))),
    );
    const applicationsInProgress = applications.filter(application => !['approved', 'rejected'].includes(application.status));
    const savedBenefits = allBenefits.filter(benefit => benefit.isSaved);
    const documentsNeeded = [...requiredTypes].filter(type => !availableTypes.has(type)).length;
    const moreInfoRequired = recommendations.filter(benefit => benefit.eligibilityStatus === 'more_info_needed').length;
    const eligibleBenefits = recommendations.filter(benefit => benefit.eligibilityStatus === 'eligible').length;
    if (backendConfigured) {
      return {
        potentialBenefits: recommendations.length,
        highMatchOpportunities: recommendations.filter(benefit => benefit.matchScore >= 80).length,
        documentsNeeded,
        upcomingDeadlines: deadlines.length,
        eligibleBenefits,
        moreInfoRequired,
        savedBenefits: savedBenefits.length,
        uploadedDocuments: documents.length,
        applicationsInProgress: applicationsInProgress.length,
      };
    }
    return {
      potentialBenefits: 0,
      highMatchOpportunities: 0,
      documentsNeeded,
      upcomingDeadlines: deadlines.length,
      eligibleBenefits: 0,
      moreInfoRequired: 0,
      savedBenefits: savedBenefits.length,
      uploadedDocuments: documents.length,
      applicationsInProgress: applicationsInProgress.length,
    };
  },
};

// ─── Resources ────────────────────────────────────────────────────────────────

export const resourcesApi = {
  async getAll(): Promise<Resource[]> {
    if (backendConfigured) return backendRequest<Resource[]>('/resources');
    await delay(400);
    return mockResources;
  },
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminApi = {
  async getBenefits(): Promise<AdminBenefitRecord[]> {
    return backendRequest<AdminBenefitRecord[]>('/admin/benefits');
  },

  async createBenefit(data: Record<string, unknown>): Promise<AdminBenefitRecord> {
    return backendRequest<AdminBenefitRecord>('/admin/benefits', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateBenefit(id: string, data: Record<string, unknown>): Promise<AdminBenefitRecord> {
    return backendRequest<AdminBenefitRecord>(`/admin/benefits/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async verifyBenefit(id: string): Promise<AdminBenefitRecord> {
    return backendRequest<AdminBenefitRecord>(
      `/admin/benefits/${encodeURIComponent(id)}/verify`,
      { method: 'POST' },
    );
  },
};

export const profileFieldsApi = {
  async get() {
    return readProfileFields(await profileApi.get());
  },
};

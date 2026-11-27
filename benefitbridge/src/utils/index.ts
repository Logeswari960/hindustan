import type { BenefitCategory, EligibilityStatus, DocumentStatus, ApplicationStatus } from '../types';

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDaysRemaining(days: number): string {
  if (days === 0) return 'Due today';
  if (days === 1) return '1 day remaining';
  if (days < 7) return `${days} days remaining`;
  if (days < 30) return `${Math.ceil(days / 7)} weeks remaining`;
  return `${Math.ceil(days / 30)} months remaining`;
}

export function getUrgencyLevel(days: number): 'critical' | 'urgent' | 'normal' {
  if (days <= 7) return 'critical';
  if (days <= 21) return 'urgent';
  return 'normal';
}

export const categoryColors: Record<BenefitCategory, { bg: string; text: string }> = {
  'Education':         { bg: 'bg-blue-50',    text: 'text-blue-700' },
  'Healthcare':        { bg: 'bg-rose-50',    text: 'text-rose-700' },
  'Housing':           { bg: 'bg-orange-50',  text: 'text-orange-700' },
  'Employment':        { bg: 'bg-violet-50',  text: 'text-violet-700' },
  'Financial Aid':     { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  'Disability':        { bg: 'bg-teal-50',    text: 'text-teal-700' },
  'Family Support':    { bg: 'bg-pink-50',    text: 'text-pink-700' },
  'Skill Development': { bg: 'bg-amber-50',   text: 'text-amber-700' },
};

export const eligibilityMeta: Record<EligibilityStatus, { label: string; bg: string; text: string; border: string }> = {
  eligible:             { label: 'Eligible',             bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  potentially_eligible: { label: 'Potentially eligible', bg: 'bg-teal-50',    text: 'text-teal-700',    border: 'border-teal-200' },
  not_eligible:         { label: 'Not eligible',         bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200' },
  more_info_needed:     { label: 'More info needed',     bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
};

export const documentStatusMeta: Record<DocumentStatus, { label: string; bg: string; text: string; border: string }> = {
  verified:     { label: 'Verified',     bg: 'bg-emerald-50',  text: 'text-emerald-700', border: 'border-emerald-200' },
  missing:      { label: 'Missing',      bg: 'bg-red-50',      text: 'text-red-700',     border: 'border-red-200' },
  needs_review: { label: 'Needs review', bg: 'bg-amber-50',    text: 'text-amber-700',   border: 'border-amber-200' },
  expired:      { label: 'Expired',      bg: 'bg-neutral-100', text: 'text-neutral-600', border: 'border-neutral-200' },
  not_assessed: { label: 'Not checked',  bg: 'bg-neutral-100', text: 'text-neutral-600', border: 'border-neutral-200' },
};

export const applicationStatusMeta: Record<ApplicationStatus, { label: string; bg: string; text: string }> = {
  saved:        { label: 'Not started',    bg: 'bg-neutral-100', text: 'text-neutral-600' },
  preparation:  { label: 'Preparing documents', bg: 'bg-amber-50', text: 'text-amber-700' },
  ready_to_apply:{ label: 'Ready to apply', bg: 'bg-teal-50',     text: 'text-teal-700' },
  submitted:    { label: 'Applied',        bg: 'bg-blue-50',     text: 'text-blue-700' },
  under_review: { label: 'Under review',   bg: 'bg-violet-50',   text: 'text-violet-700' },
  approved:     { label: 'Approved',       bg: 'bg-emerald-50',  text: 'text-emerald-700' },
  rejected:     { label: 'Rejected',       bg: 'bg-red-50',      text: 'text-red-700' },
};

export const applicationStatusOrder: ApplicationStatus[] = [
  'saved', 'preparation', 'ready_to_apply', 'submitted', 'under_review', 'approved',
];

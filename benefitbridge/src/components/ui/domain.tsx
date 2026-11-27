import { Link } from 'react-router-dom';
import { Calendar, AlertCircle, ArrowRight, Bookmark, BookmarkCheck, FileText, Clock, Trash2, Download, Building2, CheckCircle, XCircle, HelpCircle, ExternalLink } from 'lucide-react';
import type { Benefit, Document, Deadline, Application } from '../../types';
import { categoryColors, eligibilityMeta, documentStatusMeta, applicationStatusMeta, applicationStatusOrder, formatDaysRemaining, getUrgencyLevel } from '../../utils';
import { Badge, Button, Card } from './primitives';

// ── CategoryBadge ─────────────────────────────────────────────────────────────
export function CategoryBadge({ category }: { category: Benefit['category'] }) {
  const { bg, text } = categoryColors[category];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${bg} ${text}`}>
      {category}
    </span>
  );
}

// ── EligibilityBadge ──────────────────────────────────────────────────────────
export function EligibilityBadge({ status }: { status: Benefit['eligibilityStatus'] }) {
  const { label, bg, text, border } = eligibilityMeta[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${bg} ${text} ${border}`}>
      {label}
    </span>
  );
}

// ── DocumentStatusBadge ───────────────────────────────────────────────────────
export function DocumentStatusBadge({ status }: { status: Document['status'] }) {
  const { label, bg, text, border } = documentStatusMeta[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${bg} ${text} ${border}`}>
      {label}
    </span>
  );
}

// ── ApplicationStatusBadge ────────────────────────────────────────────────────
export function ApplicationStatusBadge({ status }: { status: Application['status'] }) {
  const { label, bg, text } = applicationStatusMeta[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
}

// ── MatchScore ────────────────────────────────────────────────────────────────
export function MatchScore({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const color = score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-neutral-500';
  const sizes = { sm: 'text-sm', md: 'text-base', lg: 'text-2xl' };
  return (
    <span className={`font-semibold tabular-nums ${color} ${sizes[size]}`}>
      {score}%<span className="font-normal text-neutral-400 text-xs ml-0.5"> relevance</span>
    </span>
  );
}

// ── ScoreRing ─────────────────────────────────────────────────────────────────
export function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const r = 15.9;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? '#059669' : score >= 60 ? '#d97706' : '#9ca3af';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#f3f4f6" strokeWidth="3" />
        <circle
          cx="18" cy="18" r={r} fill="none"
          stroke={color} strokeWidth="3"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-neutral-800">
        {score}%
      </span>
    </div>
  );
}

// ── BenefitCard ───────────────────────────────────────────────────────────────
interface BenefitCardProps {
  benefit: Benefit;
  onSave?: (id: string) => void;
}

export function BenefitCard({ benefit, onSave }: BenefitCardProps) {
  const missingDocs = benefit.requiredDocuments.filter(d => d.status === 'missing');
  const urgency = benefit.daysRemaining !== undefined ? getUrgencyLevel(benefit.daysRemaining) : 'normal';
  const documentStatusChecked = benefit.requiredDocuments.some(d => d.status !== 'not_assessed');
  const shownRequirements = benefit.requirements.slice(0, 4);
  const reasons = benefit.recommendationReasons ?? [];

  return (
    <Card as="article" className="p-5 flex flex-col gap-4 hover:shadow-card-md hover:border-neutral-300 transition-all duration-150">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <CategoryBadge category={benefit.category} />
          <EligibilityBadge status={benefit.eligibilityStatus} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {benefit.verifiedData && benefit.matchScore > 0
            ? <MatchScore score={benefit.matchScore} size="sm" />
            : <span className="text-[11px] text-neutral-500">{benefit.verifiedData ? 'Verified scheme' : 'Example data'}</span>}
          {onSave && (
            <button
              onClick={() => onSave(benefit.id)}
              className="p-1 rounded text-neutral-400 hover:text-navy-600 transition-colors"
              aria-label={benefit.isSaved ? 'Unsave benefit' : 'Save benefit'}
            >
              {benefit.isSaved ? <BookmarkCheck size={15} className="text-navy-600" /> : <Bookmark size={15} />}
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <div>
        <h3 className="text-[15px] font-semibold text-neutral-900 leading-snug">{benefit.name}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500">
          <Building2 size={12} className="shrink-0" />
          {benefit.provider || 'Provider not specified'}
        </p>
        <p className="mt-1 text-sm text-neutral-500 leading-relaxed line-clamp-2">{benefit.description}</p>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
        <span className="font-medium text-neutral-700">{benefit.amount || 'Amount not specified'}</span>
        {benefit.applicationStatusLabel && (
          <span className="font-medium text-neutral-700">
            Application: {benefit.applicationStatusLabel}
          </span>
        )}
        <span className="flex items-center gap-1">
            <Calendar size={11} />
            {benefit.deadline ? `Deadline ${benefit.deadline}` : 'Deadline not specified'}
            {benefit.daysRemaining !== undefined && (
              <span className={`font-medium ml-0.5 ${urgency === 'critical' ? 'text-red-600' : urgency === 'urgent' ? 'text-amber-600' : 'text-neutral-500'}`}>
                · {benefit.daysRemaining}d left
              </span>
            )}
        </span>
        {benefit.verifiedData && benefit.lastUpdated && (
          <span>Last verified {benefit.lastUpdated}</span>
        )}
      </div>

      {benefit.whoCanApply && (
        <p className="text-xs leading-relaxed text-neutral-600">
          <span className="font-medium">Eligibility: </span>{benefit.whoCanApply}
        </p>
      )}
      <p className="text-xs leading-relaxed text-neutral-600">
        <span className="font-medium">Required documents: </span>
        {benefit.requiredDocuments.length
          ? benefit.requiredDocuments.map(document => document.name).join(', ')
          : benefit.requiredDocumentsNote || 'Not specified by the source'}
      </p>

      {benefit.requirements.length > 0 ? (
        <div className="rounded-xl border border-neutral-100 bg-neutral-50/80 p-3">
          <p className="text-xs font-semibold text-neutral-700 mb-2">Eligibility assessment</p>
          <ul className="space-y-1.5">
            {shownRequirements.map(requirement => (
              <li key={requirement.id} className="flex items-start gap-2 text-xs leading-relaxed text-neutral-600">
                {requirement.met === true
                  ? <CheckCircle size={13} className="mt-0.5 shrink-0 text-emerald-600" />
                  : requirement.met === false
                    ? <XCircle size={13} className="mt-0.5 shrink-0 text-red-500" />
                    : <HelpCircle size={13} className="mt-0.5 shrink-0 text-amber-600" />}
                <span>
                  {requirement.label}
                  {requirement.mandatory ? ' · mandatory' : ''}
                  {requirement.met === true ? ' — matches' : requirement.met === false ? ' — not met' : ' — information needed'}
                </span>
              </li>
            ))}
          </ul>
          {benefit.requirements.length > shownRequirements.length && (
            <p className="mt-2 text-[11px] text-neutral-500">
              +{benefit.requirements.length - shownRequirements.length} more conditions in details
            </p>
          )}
        </div>
      ) : reasons.length > 0 ? (
        <div className="rounded-xl border border-neutral-100 bg-neutral-50/80 p-3">
          <p className="text-xs font-semibold text-neutral-700 mb-1">Why this scholarship matches your profile</p>
          <p className="text-xs text-neutral-600 leading-relaxed">{reasons[0]}</p>
        </div>
      ) : null}

      {/* Missing docs */}
      {missingDocs.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1.5 rounded-lg">
          <AlertCircle size={12} className="shrink-0" />
          <span>Missing: {missingDocs.map(d => d.name).join(', ')}</span>
        </div>
      )}
      {benefit.requiredDocuments.length > 0 && !documentStatusChecked && (
        <p className="text-xs text-neutral-500">
          {benefit.requiredDocuments.length} required document{benefit.requiredDocuments.length === 1 ? '' : 's'} · readiness not checked
        </p>
      )}

      {/* Action */}
      <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
        <Link to={`/benefits/${benefit.id}`}>
          <Button variant="secondary" size="sm" fullWidth icon={<ArrowRight size={14} />} iconPosition="right">
            View details
          </Button>
        </Link>
        {benefit.applicationUrl ? (
          <a href={benefit.applicationUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" fullWidth icon={<ExternalLink size={14} />}>
              {/\.pdf(?:$|[?#])/i.test(benefit.applicationUrl) ? 'Open official form' : 'Apply Now'}
            </Button>
          </a>
        ) : (
          <Button size="sm" fullWidth disabled>
            Link unavailable
          </Button>
        )}
      </div>
      {!benefit.applicationUrl && benefit.applicationStatusNote && (
        <p className="text-xs leading-relaxed text-neutral-500">{benefit.applicationStatusNote}</p>
      )}
    </Card>
  );
}

// ── DocumentCard ──────────────────────────────────────────────────────────────
interface DocumentCardProps {
  doc: Document;
  onUpload?: () => void;
  onDelete?: () => void;
  onDownload?: () => void;
}

export function DocumentCard({ doc, onUpload, onDelete, onDownload }: DocumentCardProps) {
  return (
    <Card className="px-4 py-3.5 flex items-center gap-4">
      <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
        <FileText size={16} className="text-neutral-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-800">{doc.name}</p>
        <p className="text-xs text-neutral-500 mt-0.5">
          {doc.type}
          {doc.uploadedDate && ` · Uploaded ${doc.uploadedDate}`}
          {doc.expiryDate && ` · Expires ${doc.expiryDate}`}
          {doc.usedIn && doc.usedIn.length > 0 && ` · Used in ${doc.usedIn.length} benefit${doc.usedIn.length > 1 ? 's' : ''}`}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <DocumentStatusBadge status={doc.status} />
        {(doc.status === 'missing' || doc.status === 'needs_review' || doc.status === 'expired') && onUpload && (
          <Button variant="secondary" size="sm" onClick={onUpload}>
            {doc.status === 'missing' ? 'Upload' : 'Re-upload'}
          </Button>
        )}
        {onDelete && (
          <button type="button" onClick={onDelete} className="p-1.5 rounded text-neutral-400 hover:text-red-600" aria-label={`Remove ${doc.name}`}>
            <Trash2 size={15} />
          </button>
        )}
        {onDownload && (
          <button type="button" onClick={onDownload} className="p-1.5 rounded text-neutral-400 hover:text-navy-700" aria-label={`Download ${doc.name}`}>
            <Download size={15} />
          </button>
        )}
      </div>
    </Card>
  );
}

// ── DeadlineCard ──────────────────────────────────────────────────────────────
export function DeadlineCard({ deadline }: { deadline: Deadline }) {
  const urgency = getUrgencyLevel(deadline.daysRemaining);
  const urgencyStyles = {
    critical: 'bg-red-50 text-red-700 border-red-100',
    urgent:   'bg-amber-50 text-amber-700 border-amber-100',
    normal:   'bg-neutral-50 text-neutral-600 border-neutral-100',
  };

  return (
    <Card className="px-5 py-4 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 border ${urgencyStyles[urgency]}`}>
        <span className="text-lg font-bold leading-none">{deadline.daysRemaining}</span>
        <span className="text-[10px] font-medium mt-0.5">days</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-neutral-900 truncate">{deadline.benefitName}</p>
        <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
          <Clock size={11} />
          {deadline.type} · {deadline.date}
        </p>
      </div>
      <Link to={`/benefits/${deadline.benefitId}`} className="shrink-0">
        <Button variant="secondary" size="sm" icon={<ArrowRight size={13} />} iconPosition="right">
          View
        </Button>
      </Link>
    </Card>
  );
}

// ── ApplicationTimeline ───────────────────────────────────────────────────────
export function ApplicationTimeline({ status }: { status: Application['status'] }) {
  const steps = applicationStatusOrder;
  const currentIdx = steps.indexOf(status === 'rejected' ? 'under_review' : status);
  const labels: Record<string, string> = {
    saved: 'Not started', preparation: 'Preparing', ready_to_apply: 'Ready', submitted: 'Applied',
    under_review: 'Under review', approved: 'Decision',
  };

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={[
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                done   ? 'bg-navy-700 text-white' : '',
                active ? 'bg-navy-700 text-white ring-4 ring-navy-100' : '',
                !done && !active ? 'bg-neutral-100 text-neutral-400' : '',
              ].filter(Boolean).join(' ')}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`mt-1 text-[10px] font-medium whitespace-nowrap ${active ? 'text-navy-700' : 'text-neutral-400'}`}>
                {labels[step]}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px mx-1 mb-4 ${done ? 'bg-navy-700' : 'bg-neutral-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

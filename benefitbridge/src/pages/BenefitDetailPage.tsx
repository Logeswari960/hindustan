import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, HelpCircle, AlertCircle, ExternalLink, Bookmark, BookmarkCheck, Calendar, FileText, ChevronRight } from 'lucide-react';
import { applyDocumentReadiness, applicationsApi, benefitsApi, documentsApi, eligibilityApi, profileApi } from '../services/api';
import { backendConfigured, hasBackendSession, hasDemoSession } from '../services/backendClient';
import type { Benefit } from '../types';
import { Button, Card, Skeleton, Toast, Breadcrumb } from '../components/ui';
import { CategoryBadge, EligibilityBadge, DocumentStatusBadge } from '../components/ui/domain';

function getDomain(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

export default function BenefitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [benefit, setBenefit] = useState<Benefit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' } | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    let cancelled = false;
    const loadBenefit = async () => {
      try {
        let value = await benefitsApi.getById(id);
        if (value && backendConfigured && (hasBackendSession() || hasDemoSession())) {
          try {
            const documents = await documentsApi.getAll();
            value = applyDocumentReadiness(value, documents);
          } catch (error) {
            if (!cancelled) setToast({ msg: error instanceof Error ? `Document readiness could not be loaded: ${error.message}` : 'Document readiness could not be loaded.', type: 'info' });
          }

          try {
            const profile = await profileApi.get();
            if (profile) {
              const recommendations = await benefitsApi.getRecommendations();
              const recommendation = recommendations.find(item => item.id === value?.id);
              if (recommendation) {
                value = {
                  ...value,
                  matchScore: recommendation.matchScore,
                  recommendationReasons: recommendation.recommendationReasons,
                  eligibilityStatus: recommendation.eligibilityStatus,
                  eligibilityResult: recommendation.eligibilityResult,
                  requirements: recommendation.requirements,
                };
              } else {
                const assessment = await eligibilityApi.check(value.id, profile);
                value = {
                  ...value,
                  eligibilityStatus: assessment.eligibilityStatus,
                  eligibilityResult: assessment.result,
                  requirements: assessment.requirements,
                };
              }
            }
          } catch (error) {
            if (!cancelled) setToast({ msg: error instanceof Error ? `Eligibility details could not be loaded: ${error.message}` : 'Eligibility details could not be loaded.', type: 'info' });
          }
        }

        if (!cancelled) {
          setBenefit(value);
          setSaved(value?.isSaved ?? false);
        }
      } catch (error) {
        if (!cancelled) {
          setToast({ msg: error instanceof Error ? error.message : 'Could not load this benefit.', type: 'info' });
          setBenefit(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadBenefit();
    return () => { cancelled = true; };
  }, [id]);

  const handleSave = async () => {
    if (!benefit) return;
    if (backendConfigured && !hasBackendSession() && !hasDemoSession()) {
      navigate('/login');
      return;
    }
    try {
      if (saved) await benefitsApi.unsave(benefit.id);
      else await benefitsApi.saveForLater(benefit.id);
      setSaved(!saved);
    } catch (error) {
      setToast({ msg: error instanceof Error ? error.message : 'Could not update saved benefits.', type: 'info' });
      return;
    }
    setToast({ msg: saved ? 'Removed from saved benefits' : 'Saved to your benefits list', type: 'success' });
  };

  const startApplication = async () => {
    if (!benefit) return;
    if (backendConfigured && !hasBackendSession() && !hasDemoSession()) {
      navigate('/login');
      return;
    }
    setStarting(true);
    try {
      await applicationsApi.start(benefit.id);
      navigate('/dashboard/applications');
    } catch (error) {
      setToast({ msg: error instanceof Error ? error.message : 'Could not start tracking this benefit.', type: 'info' });
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-5 w-full" />
        <div className="grid lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!benefit) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-neutral-500 mb-4">We couldn't find this benefit.</p>
        <Link to="/search"><Button variant="secondary">Back to search</Button></Link>
      </div>
    );
  }

  const metCount = benefit.requirements.filter(r => r.met === true).length;
  const applicationDomain = getDomain(benefit.applicationUrl);
  const educationFields = new Set(['education', 'course', 'course_year', 'institution_type', 'academic_percentage']);
  const incomeFields = new Set(['annual_income', 'income_range']);
  const groupedRequirements = [
    { title: 'Education requirements', items: benefit.requirements.filter(requirement => requirement.field && educationFields.has(requirement.field)) },
    { title: 'Income requirements', items: benefit.requirements.filter(requirement => requirement.field && incomeFields.has(requirement.field)) },
    { title: 'Other eligibility requirements', items: benefit.requirements.filter(requirement => !requirement.field || (!educationFields.has(requirement.field) && !incomeFields.has(requirement.field))) },
  ].filter(group => group.items.length > 0);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-6">
        <Breadcrumb items={[{ label: 'Benefits', href: '/search' }, { label: benefit.name }]} />
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2 mb-3">
          <CategoryBadge category={benefit.category} />
          <EligibilityBadge status={benefit.eligibilityStatus} />
          {benefit.applicationStatusLabel && (
            <span className="inline-flex items-center rounded-md border border-neutral-200 bg-white px-2 py-0.5 text-xs font-medium text-neutral-700">
              Application: {benefit.applicationStatusLabel}
            </span>
          )}
          {benefit.verifiedData && benefit.matchScore > 0 && (
            <span className="inline-flex items-center rounded-md border border-navy-100 bg-navy-50 px-2 py-0.5 text-xs font-medium text-navy-700">
              {benefit.matchScore}% text relevance
            </span>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-2 leading-tight">{benefit.name}</h1>
        <p className="text-neutral-500 leading-relaxed max-w-2xl">{benefit.description}</p>
        <p className="mt-2 text-sm text-neutral-500">
          Provider: <span className="font-medium text-neutral-700">{benefit.provider || 'Not specified'}</span>
          {benefit.verifiedData && benefit.lastUpdated && <> · Last verified: <span className="font-medium text-neutral-700">{benefit.lastUpdated}</span></>}
        </p>

        <div className="flex flex-wrap gap-5 mt-4 text-sm">
          <span className="font-semibold text-neutral-800">{benefit.amount || 'Amount not specified'}</span>
          {benefit.deadline ? (
            <span className="flex items-center gap-1.5 text-neutral-600">
              <Calendar size={14} className="text-neutral-400" />
              Deadline: <span className="font-medium">{benefit.deadline}</span>
              {benefit.daysRemaining !== undefined && (
                <span className={`font-medium ml-1 ${benefit.daysRemaining <= 14 ? 'text-red-600' : 'text-amber-600'}`}>
                  ({benefit.daysRemaining} days remaining)
                </span>
              )}
            </span>
          ) : <span className="text-neutral-500">Deadline not specified</span>}
        </div>

        <div className="flex flex-wrap gap-3 mt-6">
          <Button size="lg" loading={starting} onClick={startApplication}>
            Start tracking application
          </Button>
          <Button size="lg" variant="secondary" icon={saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />} onClick={handleSave}>
            {saved ? 'Saved' : 'Save benefit'}
          </Button>
        </div>
        {benefit.applicationUrl ? (
          <a href={benefit.applicationUrl} target="_blank" rel="noopener noreferrer">
            <Button size="lg" variant="secondary" icon={<ExternalLink size={16} />}>
              {/\.pdf(?:$|[?#])/i.test(benefit.applicationUrl) ? 'Open Official Application Form' : 'Apply Now'}
            </Button>
          </a>
        ) : (
          <p className="mt-3 text-sm text-neutral-500">
            An official application portal is not available in this record. Use the official scheme details link to confirm the current application route.
          </p>
        )}
        {applicationDomain && (
          <p className="mt-2 text-xs text-neutral-500">
            Official application portal: <span className="font-medium text-neutral-700">{applicationDomain}</span>
          </p>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-6">
            <h2 className="text-base font-semibold text-neutral-900 mb-3">About this benefit</h2>
            <p className="text-sm text-neutral-600 leading-relaxed">{benefit.aboutText}</p>
          </Card>

          {benefit.whoCanApply && <Card className="p-6">
            <h2 className="text-base font-semibold text-neutral-900 mb-3">Who can apply</h2>
            <p className="text-sm text-neutral-600 leading-relaxed">{benefit.whoCanApply}</p>
          </Card>}

          <Card className="p-6">
            <h2 className="text-base font-semibold text-neutral-900 mb-3">Key scheme criteria</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-neutral-500">Education level</dt>
                <dd className="mt-1 text-neutral-800">{benefit.educationLevel || 'Not specified'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-neutral-500">Income limit</dt>
                <dd className="mt-1 text-neutral-800">{benefit.incomeLimit || 'Not specified'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-neutral-500">Category criteria</dt>
                <dd className="mt-1 text-neutral-800">{benefit.categoryCriteria || 'Not specified'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-neutral-500">Location</dt>
                <dd className="mt-1 text-neutral-800">{benefit.locationCriteria || benefit.state || 'Not specified'}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-neutral-900">Eligibility requirements</h2>
              {benefit.requirements.length > 0 && <span className="text-sm text-neutral-500">{metCount} of {benefit.requirements.length} met</span>}
            </div>
            {groupedRequirements.length > 0 ? groupedRequirements.map(group => (
              <div key={group.title} className="mb-4 last:mb-0">
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{group.title}</h3>
                {group.items.map(req => (
                  <div key={req.id} className="flex items-start gap-3 py-3 border-b border-neutral-100 last:border-0">
                    {req.met === true
                      ? <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      : req.met === false
                        ? <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                        : <HelpCircle size={16} className="text-neutral-400 shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-neutral-800">{req.label}</p>
                        <span className={`text-xs font-medium shrink-0 ${req.met === true ? 'text-emerald-600' : req.met === false ? 'text-red-500' : 'text-neutral-400'}`}>
                          {req.met === true ? 'Met' : req.met === false ? 'Not met' : 'Information needed'}
                        </span>
                      </div>
                      {(req.userValue || req.requiredValue) && (
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {req.userValue && <span>Your value: <span className="font-medium text-neutral-700">{req.userValue}</span></span>}
                          {req.userValue && req.requiredValue && <span className="mx-1.5">·</span>}
                          {req.requiredValue && <span>Required: <span className="font-medium text-neutral-700">{req.requiredValue}</span></span>}
                        </p>
                      )}
                      {req.mandatory && <p className="mt-1 text-xs font-medium text-neutral-500">Mandatory condition</p>}
                      {req.detail && <p className="text-xs text-amber-700 mt-1 flex items-center gap-1"><AlertCircle size={11} />{req.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )) : (
              <p className="text-sm text-neutral-500">
                {benefit.verifiedData
                  ? 'No machine-readable eligibility conditions are available for this verified record.'
                  : 'Eligibility has not been assessed for this illustrative record.'}
              </p>
            )}
            <div className="mt-4 p-3 bg-neutral-50 border border-neutral-100 rounded-lg">
              <p className="text-xs text-neutral-500 leading-relaxed">
                <span className="font-medium text-neutral-600">Eligibility assessment</span> — Eligibility results are preliminary assessments based on the information provided. Final eligibility and approval are determined by the respective scheme authority.
              </p>
            </div>
          </Card>

          {benefit.recommendationReasons && benefit.recommendationReasons.length > 0 && (
            <Card className="p-6">
              <h2 className="text-base font-semibold text-neutral-900 mb-3">Why this scholarship matches your profile</h2>
              <ul className="space-y-2">
                {benefit.recommendationReasons.map(reason => (
                  <li key={reason} className="flex items-start gap-2 text-sm text-neutral-600 leading-relaxed">
                    {reason.includes('does not meet')
                      ? <XCircle size={15} className="mt-0.5 shrink-0 text-red-500" />
                      : reason.startsWith('More information')
                        ? <HelpCircle size={15} className="mt-0.5 shrink-0 text-amber-600" />
                        : <CheckCircle size={15} className="mt-0.5 shrink-0 text-emerald-600" />}
                    {reason}
                  </li>
                ))}
              </ul>
              {benefit.matchScore > 0 && (
                <p className="mt-3 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
                  Text relevance ranks profile and scheme wording; it is separate from the rule-based eligibility assessment.
                </p>
              )}
            </Card>
          )}

          {benefit.applicationSteps.length > 0 && <Card className="p-6">
            <h2 className="text-base font-semibold text-neutral-900 mb-4">Application process</h2>
            <div className="space-y-4">
              {benefit.applicationSteps.map((step, i) => (
                <div key={step.number} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {step.number}
                    </div>
                    {i < benefit.applicationSteps.length - 1 && (
                      <div className="w-px flex-1 bg-neutral-200 mt-2" />
                    )}
                  </div>
                  <div className="pb-4 last:pb-0 min-w-0">
                    <p className="text-sm font-semibold text-neutral-800">{step.title}</p>
                    <p className="text-sm text-neutral-500 mt-0.5 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>}

          {benefit.importantDates.length > 0 && (
            <Card className="p-6">
              <h2 className="text-base font-semibold text-neutral-900 mb-3">Important dates</h2>
              <div className="space-y-2">
                {benefit.importantDates.map(d => (
                  <div key={d.label} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-0">
                    <span className="text-sm text-neutral-600">{d.label}</span>
                    <span className="text-sm font-medium text-neutral-800">{d.date}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <Card className="p-5">
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Eligibility assessment</p>
            <div className="flex items-center gap-3 mb-3">
              <div>
                <p className="text-sm font-semibold text-neutral-900">
                  {benefit.eligibilityResult || (benefit.verifiedData ? 'Assessment unavailable' : 'Not assessed')}
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  {benefit.requirements.length > 0
                    ? `${metCount} of ${benefit.requirements.length} published conditions currently match your profile.`
                    : 'No machine-readable scheme rules are available to assess.'}
                </p>
              </div>
            </div>
            <EligibilityBadge status={benefit.eligibilityStatus} />
            <p className="text-xs text-neutral-400 leading-relaxed mt-3">
              Similarity scores do not determine eligibility. Any rule-based assessment is preliminary; the scheme authority makes the final decision.
            </p>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-neutral-800 mb-3">Documents required</h3>
            {benefit.requiredDocuments.length > 0 ? <div className="space-y-2.5">
              {benefit.requiredDocuments.map(doc => (
                <div key={doc.name} className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <FileText size={13} className="text-neutral-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm text-neutral-700 leading-snug">{doc.name}</p>
                      {doc.description && <p className="text-xs text-neutral-400 mt-0.5">{doc.description}</p>}
                    </div>
                  </div>
                  <DocumentStatusBadge status={doc.status} />
                </div>
              ))}
            </div> : <p className="text-sm text-neutral-500">No required documents are specified in this record.</p>}
            {benefit.requiredDocuments.some(d => d.status === 'missing') && (
              <Link to="/dashboard/documents" className="block mt-4">
                <Button variant="secondary" size="sm" fullWidth>Upload missing documents</Button>
              </Link>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-neutral-800 mb-2">Official scheme information</h3>
            <p className="text-xs text-neutral-500 mb-3 leading-relaxed">
              {benefit.verifiedData
                ? 'Confirm current requirements and deadlines with the official scheme authority. BenefitBridge does not submit applications.'
                : 'This is illustrative information only and has not been verified against an official scheme record.'}
            </p>
            {benefit.officialUrl ? (
              <a
                href={benefit.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-navy-600 hover:text-navy-800 font-medium transition-colors"
              >
                View Official Scheme Details
                <ExternalLink size={13} />
              </a>
            ) : <p className="text-sm text-neutral-500">Official source URL not provided.</p>}
            {benefit.applicationStatusNote && (
              <p className="mt-3 text-xs leading-relaxed text-neutral-500">{benefit.applicationStatusNote}</p>
            )}
            {applicationDomain === 'scholarships.gov.in' && (
              <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                Select this scholarship on the official portal. Login/OTR may be required.
              </p>
            )}
          </Card>

          <div className="text-xs text-neutral-400 leading-relaxed px-1">
            {benefit.verifiedData
              ? `Scheme details last verified ${benefit.lastUpdated || 'date not specified'}. Confirm updates with the official authority.`
              : 'This catalogue record is illustrative demo data and must not be relied on for an application.'}
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, ArrowRight } from 'lucide-react';
import { applicationsApi } from '../services/api';
import type { Application, ApplicationStatus } from '../types';
import { Card, Button, EmptyState, Skeleton, Select, Input, Toast } from '../components/ui';
import { CategoryBadge, ApplicationStatusBadge, ApplicationTimeline } from '../components/ui/domain';

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: 'saved', label: 'Not started' },
  { value: 'preparation', label: 'Preparing documents' },
  { value: 'ready_to_apply', label: 'Ready to apply' },
  { value: 'submitted', label: 'Applied' },
  { value: 'under_review', label: 'Under review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export default function ApplicationsPage() {
  const [apps, setApps]       = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    applicationsApi.getAll()
      .then(setApps)
      .catch(() => setToast('Could not load applications.'))
      .finally(() => setLoading(false));
  }, []);

  const updateApplication = async (id: string, updates: Partial<Pick<Application, 'status' | 'referenceNumber' | 'submissionDate' | 'notes'>>) => {
    try {
      const updated = await applicationsApi.update(id, updates);
      setApps(current => current.map(app => app.id === id ? updated : app));
      setToast('Application tracking updated.');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Could not update application.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Applications</h1>
        <p className="text-neutral-500 text-sm mt-1">Track the status of your benefit applications.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : apps.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={22} />}
          title="No applications yet"
          description="Once you start an application, you can track its progress here."
          action={<Link to="/search"><Button>Explore benefits</Button></Link>}
        />
      ) : (
        <div className="space-y-4">
          {apps.map(app => (
            <Card key={app.id} className="p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <CategoryBadge category={app.category} />
                    <ApplicationStatusBadge status={app.status} />
                  </div>
                  <h3 className="text-base font-semibold text-neutral-900 leading-snug">{app.benefitName}</h3>
                  {app.referenceNumber && (
                    <p className="text-xs text-neutral-500 mt-0.5">Ref: {app.referenceNumber}</p>
                  )}
                </div>
                <Link to={`/benefits/${app.benefitId}`} className="shrink-0">
                  <Button variant="secondary" size="sm" icon={<ArrowRight size={13} />} iconPosition="right">View</Button>
                </Link>
              </div>

              {/* Timeline */}
              <div className="mb-4">
                <ApplicationTimeline status={app.status} />
              </div>

              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                <label className="text-xs text-neutral-500">
                  Status
                  <Select
                    className="mt-1"
                    value={app.status}
                    onChange={event => updateApplication(app.id, { status: event.target.value as ApplicationStatus })}
                    aria-label={`Application status for ${app.benefitName}`}
                  >
                    {STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </Select>
                </label>
                <label className="text-xs text-neutral-500">
                  Reference number (optional)
                  <Input
                    className="mt-1"
                    value={app.referenceNumber ?? ''}
                    placeholder="Enter portal reference"
                    onBlur={event => updateApplication(app.id, { referenceNumber: event.target.value.trim() })}
                  />
                </label>
                <label className="text-xs text-neutral-500">
                  Submission date (optional)
                  <Input
                    className="mt-1"
                    type="date"
                    value={app.submissionDate ?? ''}
                    onBlur={event => updateApplication(app.id, { submissionDate: event.target.value })}
                  />
                </label>
                <label className="text-xs text-neutral-500">
                  Personal note (optional)
                  <Input
                    className="mt-1"
                    value={app.notes ?? ''}
                    placeholder="Add a private reminder"
                    onBlur={event => updateApplication(app.id, { notes: event.target.value })}
                  />
                </label>
              </div>

              {/* Next action */}
              <div className="flex items-start justify-between gap-3 pt-3 border-t border-neutral-100">
                <div>
                  <p className="text-xs text-neutral-500 mb-0.5">Next action</p>
                  <p className="text-sm text-neutral-800 font-medium">{app.nextAction}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-neutral-500 mb-0.5">Last updated</p>
                  <p className="text-xs text-neutral-600">{app.lastUpdated}</p>
                </div>
              </div>
              {app.history && app.history.length > 0 && (
                <details className="mt-3 text-xs text-neutral-500">
                  <summary className="cursor-pointer font-medium">Application history ({app.history.length})</summary>
                  <ul className="mt-2 space-y-1">
                    {app.history.map((entry, index) => (
                      <li key={`${entry.date}-${index}`}>{entry.date} · {STATUS_OPTIONS.find(option => option.value === entry.status)?.label ?? entry.status}</li>
                    ))}
                  </ul>
                </details>
              )}
            </Card>
          ))}
        </div>
      )}
      {toast && <Toast message={toast} type="info" onClose={() => setToast(null)} />}
    </div>
  );
}

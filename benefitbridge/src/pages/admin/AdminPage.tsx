import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Plus, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button, Card } from '../../components/ui';
import { adminApi } from '../../services/api';
import type { AdminBenefitRecord } from '../../types';

const EMPTY_RECORD = {
  scheme_id: null,
  name: '',
  description: '',
  category: 'Education',
  state: null,
  benefit_amount: null,
  benefit_summary: '',
  official_url: '',
  application_url: null,
  official_source_url: null,
  official_application_url: null,
  official_source: '',
  official_department: '',
  education_level: '',
  course: '',
  institution_type: '',
  academic_requirements: '',
  last_verified_at: '',
  last_verified_date: null,
  application_open_date: null,
  deadline: null,
  application_deadline: null,
  application_status: 'Status Not Confirmed',
  application_status_note: '',
  income_limit: 'Not specified',
  category_criteria: 'Not specified',
  location_criteria: 'Not specified',
  eligibility_criteria: [],
  required_documents_note: 'Not specified by the official source',
  required_documents: [],
  eligibility_rules: [],
  tags: [],
};

const SYSTEM_FIELDS = new Set([
  'id', 'verification_status', 'created_by', 'updated_by', 'verified_by',
  'created_at', 'updated_at',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export default function AdminPage() {
  const [records, setRecords] = useState<AdminBenefitRecord[]>([]);
  const [draft, setDraft] = useState(() => JSON.stringify(EMPTY_RECORD, null, 2));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRecords(await adminApi.getBenefits());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load scheme records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const startNew = () => {
    setSelectedId(null);
    setDraft(JSON.stringify(EMPTY_RECORD, null, 2));
    setNotice(null);
    setError(null);
  };

  const editRecord = (record: AdminBenefitRecord) => {
    const payload = Object.fromEntries(
      Object.entries(record).filter(([key]) => !SYSTEM_FIELDS.has(key)),
    );
    setSelectedId(record.id);
    setDraft(JSON.stringify(payload, null, 2));
    setNotice(null);
    setError(null);
  };

  const saveRecord = async () => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const payload: unknown = JSON.parse(draft);
      if (!isRecord(payload)) {
        throw new Error('Enter one JSON object describing a single scheme record.');
      }
      const saved = selectedId
        ? await adminApi.updateBenefit(selectedId, payload)
        : await adminApi.createBenefit(payload);
      setSelectedId(saved.id);
      setNotice('Saved as pending. It is not shown to students until an administrator verifies it.');
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save this scheme record.');
    } finally {
      setSaving(false);
    }
  };

  const verifyRecord = async (id: string) => {
    if (!window.confirm('Confirm that you checked the current official source, eligibility rules, published benefit amount (or confirmed it is not specified), and application route or explicitly recorded that no route is published?')) return;
    setError(null);
    setNotice(null);
    try {
      await adminApi.verifyBenefit(id);
      setNotice('Scheme verified and published.');
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not verify this scheme.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-navy-700" />
            <h1 className="text-2xl font-bold text-neutral-900">Scheme source management</h1>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-neutral-600">
            Add records only from official scheme sources. New or edited records stay pending and are excluded from student results until an administrator verifies them.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<RefreshCw size={15} />} onClick={() => void refresh()} disabled={loading}>
            Refresh
          </Button>
          <Button icon={<Plus size={15} />} onClick={startNew}>New record</Button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
          {error.includes('Administrator access required') && (
            <p className="mt-1">Sign in with an administrator account. Regular accounts cannot add or verify schemes.</p>
          )}
        </div>
      )}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-neutral-900">Scheme records</h2>
            <span className="text-xs text-neutral-500">{records.length} total</span>
          </div>
          {loading ? (
            <p className="py-8 text-sm text-neutral-500">Loading records…</p>
          ) : records.length === 0 && !error ? (
            <p className="py-8 text-sm text-neutral-500">No scheme records have been added.</p>
          ) : (
            <ul className="mt-4 divide-y divide-neutral-100">
              {records.map(record => (
                <li key={record.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-900">{record.name}</p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {record.verification_status === 'verified' ? 'Verified' : 'Pending verification'}
                        {typeof record.official_source === 'string' && record.official_source ? ` · ${record.official_source}` : ''}
                      </p>
                      {typeof record.official_url === 'string' && record.official_url && (
                        <a className="mt-1 inline-flex items-center gap-1 text-xs text-navy-700 hover:underline" href={record.official_url} target="_blank" rel="noopener noreferrer">
                          Official scheme information <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => editRecord(record)}>Edit</Button>
                      {record.verification_status !== 'verified' && (
                        <Button size="sm" onClick={() => void verifyRecord(record.id)}>Verify</Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-neutral-900">{selectedId ? 'Edit scheme record' : 'Add scheme record'}</h2>
            {selectedId && <Button size="sm" variant="ghost" onClick={startNew}>Cancel edit</Button>}
          </div>
          <p className="mt-2 text-sm text-neutral-600">
            Enter a JSON object matching the backend schema. Use separate official source and application URLs when available. If no application route is published, leave its URL null and record “Status Not Confirmed” with an explanation. The official benefit amount may be recorded as “Amount not specified by official source”.
          </p>
          <p className="mt-2 text-xs text-neutral-500">
            Eligibility rules use a supported profile field, an operator (equals, lte, gte, one_of, manual_review), the official criterion value, a label, and an optional mandatory flag. Use manual_review when a published condition cannot be safely determined from profile fields.
          </p>
          <label htmlFor="scheme-record-json" className="sr-only">Scheme record JSON</label>
          <textarea
            id="scheme-record-json"
            className="mt-4 min-h-[26rem] w-full rounded-lg border border-neutral-300 bg-neutral-50 p-3 font-mono text-xs leading-relaxed text-neutral-800 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500"
            spellCheck={false}
            value={draft}
            onChange={event => setDraft(event.target.value)}
          />
          <div className="mt-4 flex justify-end">
            <Button onClick={() => void saveRecord()} loading={saving}>
              {selectedId ? 'Save changes as pending' : 'Save as pending'}
            </Button>
          </div>
        </Card>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <ShieldAlert size={18} className="mt-0.5 shrink-0" />
        <p>Verification is an administrator attestation, not automatic fact-checking. Check the current official source and every eligibility rule before publishing. No sample records are seeded.</p>
      </div>
    </div>
  );
}

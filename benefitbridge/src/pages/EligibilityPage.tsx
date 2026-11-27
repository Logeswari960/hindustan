import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, HelpCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { benefitsApi, eligibilityApi, profileApi } from '../services/api';
import type { Benefit } from '../types';
import { Card, SkeletonCard, Button } from '../components/ui';
import { CategoryBadge, EligibilityBadge } from '../components/ui/domain';

export default function EligibilityPage() {
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<Benefit | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectBenefit = async (benefit: Benefit) => {
    setSelected(benefit);
    if (!benefit.verifiedData) return;
    try {
      const profile = await profileApi.get();
      if (!profile) return;
      const assessment = await eligibilityApi.check(benefit.id, profile);
      const updated = { ...benefit, eligibilityStatus: assessment.eligibilityStatus, requirements: assessment.requirements };
      setSelected(updated);
      setBenefits(current => current.map(item => item.id === benefit.id ? updated : item));
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not assess this benefit.');
    }
  };

  useEffect(() => {
    benefitsApi.getAll().then(b => {
      setBenefits(b);
      if (b[0]) void selectBenefit(b[0]);
      setLoading(false);
    }).catch(requestError => {
      setError(requestError instanceof Error ? requestError.message : 'Could not load benefit records.');
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Eligibility</h1>
        <p className="text-neutral-500 text-sm mt-1 max-w-xl">
          Condition-by-condition eligibility assessments based on your profile. Final eligibility is determined by the respective program authority.
        </p>
      </div>

      {loading ? (
        <div className="grid lg:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid lg:grid-cols-5 gap-6">
          {/* List */}
          <div className="lg:col-span-2 space-y-2">
            {benefits.map(b => (
              <button
                key={b.id}
                onClick={() => void selectBenefit(b)}
                className={[
                  'w-full text-left rounded-xl border p-4 transition-all',
                  selected?.id === b.id
                    ? 'border-navy-300 bg-navy-50 shadow-card'
                    : 'border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-card',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-neutral-900 leading-snug">{b.name}</p>
                  <span className="text-[11px] text-neutral-500 shrink-0">Unverified example</span>
                </div>
                <EligibilityBadge status={b.eligibilityStatus} />
              </button>
            ))}
          </div>

          {/* Detail */}
          {selected && (
            <div className="lg:col-span-3">
              <Card className="p-6 space-y-5">
                <div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <CategoryBadge category={selected.category} />
                    <EligibilityBadge status={selected.eligibilityStatus} />
                  </div>
                  <h2 className="text-lg font-bold text-neutral-900 leading-snug">{selected.name}</h2>
                </div>

                {/* Score */}
                <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                  <div className="w-16 h-16 rounded-full border-4 border-neutral-200 flex items-center justify-center text-[10px] text-neutral-500 text-center">
                    {selected.verifiedData ? 'Rule-based' : 'Not assessed'}
                  </div>
                  <div>
                    <p className="text-xl font-bold text-neutral-900">
                      {selected.verifiedData ? selected.eligibilityStatus.replace(/_/g, ' ') : 'No verified assessment'}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {selected.verifiedData ? 'Based on the saved profile and published scheme rules.' : 'This example has no verified scheme rules.'}
                    </p>
                  </div>
                </div>

                {/* Requirements */}
                <div>
                  <h3 className="text-sm font-semibold text-neutral-800 mb-3">Requirement breakdown</h3>
                  <div>
                    {selected.requirements.map(req => (
                      <div key={req.id} className="flex items-start gap-3 py-3 border-b border-neutral-100 last:border-0">
                        {req.met === true
                          ? <CheckCircle size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                          : req.met === false
                          ? <XCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                          : <HelpCircle size={15} className="text-neutral-400 shrink-0 mt-0.5" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm text-neutral-800">{req.label}</p>
                            <span className={`text-xs font-medium shrink-0 ${req.met === true ? 'text-emerald-600' : req.met === false ? 'text-red-500' : 'text-neutral-400'}`}>
                              {req.met === true ? '✓' : req.met === false ? '✗' : '?'}
                            </span>
                          </div>
                          {(req.userValue || req.requiredValue) && (
                            <p className="text-xs text-neutral-500 mt-0.5">
                              {req.userValue && <span>Your value: <span className="font-medium">{req.userValue}</span></span>}
                              {req.userValue && req.requiredValue && ' · '}
                              {req.requiredValue && <span>Required: <span className="font-medium">{req.requiredValue}</span></span>}
                            </p>
                          )}
                          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
                          {req.detail && (
                            <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                              <AlertCircle size={11} className="shrink-0" />{req.detail}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Eligibility results are preliminary assessments based on the information provided. Final eligibility and approval are determined by the respective scheme authority. Sample catalogue rules are not verified.
                  </p>
                </div>

                <Link to={`/benefits/${selected.id}`}>
                  <Button variant="secondary" size="sm" icon={<ArrowRight size={14} />} iconPosition="right">
                    View full benefit details
                  </Button>
                </Link>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

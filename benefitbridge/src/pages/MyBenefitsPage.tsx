import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { applyDocumentReadiness, benefitsApi, documentsApi } from '../services/api';
import type { Benefit } from '../types';
import { SkeletonCard, EmptyState, Button, Tabs, Select } from '../components/ui';
import { BenefitCard } from '../components/ui/domain';

const TABS = [
  { label: 'Recommended',          value: 'recommended' },
  { label: 'Saved',                value: 'saved' },
  { label: 'Potentially eligible', value: 'potentially_eligible' },
  { label: 'All',                  value: 'all' },
];

export default function MyBenefitsPage() {
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [recommendations, setRecommendations] = useState<Benefit[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [tab, setTab]           = useState('recommended');
  const [educationFilter, setEducationFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [eligibilityFilter, setEligibilityFilter] = useState('');

  useEffect(() => {
    Promise.all([benefitsApi.getAll(), benefitsApi.getRecommendations(), documentsApi.getAll()])
      .then(([allBenefits, matchedBenefits, documents]) => {
        setBenefits(allBenefits.map(benefit => applyDocumentReadiness(benefit, documents)));
        setRecommendations(matchedBenefits.map(benefit => applyDocumentReadiness(benefit, documents)));
      })
      .catch(requestError => setError(requestError instanceof Error ? requestError.message : 'Could not load benefits.'))
      .finally(() => setLoading(false));
  }, []);

  const potentiallyEligible = benefits.filter(benefit => benefit.eligibilityStatus !== 'not_eligible');
  const displayed = tab === 'recommended'
    ? recommendations.filter(benefit => benefit.eligibilityStatus !== 'not_eligible')
    : tab === 'potentially_eligible'
    ? potentiallyEligible
    : tab === 'saved'
    ? benefits.filter(benefit => benefit.isSaved)
    : benefits;
  const filteredDisplayed = displayed.filter(benefit => {
    const schemeEducation = `${benefit.educationLevel ?? ''} ${benefit.tags.join(' ')}`.toLowerCase();
    if (educationFilter === 'undergraduate' && !schemeEducation.includes('undergraduate')) return false;
    if (educationFilter === 'diploma' && !/diploma|polytechnic|iti/.test(schemeEducation)) return false;
    if (educationFilter === 'postgraduate' && !schemeEducation.includes('postgraduate')) return false;
    if (locationFilter === 'Tamil Nadu' && benefit.state !== 'Tamil Nadu' && benefit.state !== 'All India') return false;
    if (locationFilter === 'All India' && benefit.state !== 'All India') return false;
    if (eligibilityFilter && benefit.eligibilityStatus !== eligibilityFilter) return false;
    return true;
  });
  const hasActiveFilters = Boolean(educationFilter || locationFilter || eligibilityFilter);
  const clearFilters = () => {
    setEducationFilter('');
    setLocationFilter('');
    setEligibilityFilter('');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">My Benefits</h1>
        <p className="text-neutral-500 text-sm mt-1">Benefits matched to your profile, sorted by relevance.</p>
      </div>

      <Tabs
        tabs={TABS.map(t => ({
          ...t,
          count: t.value === 'all'
            ? benefits.length
            : t.value === 'recommended'
              ? recommendations.length
              : t.value === 'saved'
                ? benefits.filter(benefit => benefit.isSaved).length
                : potentiallyEligible.length,
        }))}
        active={tab}
        onChange={value => {
          setTab(value);
          setEligibilityFilter('');
        }}
      />

      <div className="grid gap-3 rounded-xl border border-blue-100 bg-white p-4 sm:grid-cols-3">
        <div>
          <label htmlFor="benefit-education-filter" className="mb-1.5 block text-xs font-medium text-neutral-600">
            Education level
          </label>
          <Select id="benefit-education-filter" value={educationFilter} onChange={event => setEducationFilter(event.target.value)}>
            <option value="">All education levels</option>
            <option value="undergraduate">Undergraduate</option>
            <option value="diploma">Diploma / ITI</option>
            <option value="postgraduate">Postgraduate</option>
          </Select>
        </div>
        <div>
          <label htmlFor="benefit-location-filter" className="mb-1.5 block text-xs font-medium text-neutral-600">
            Scheme location
          </label>
          <Select id="benefit-location-filter" value={locationFilter} onChange={event => setLocationFilter(event.target.value)}>
            <option value="">All locations</option>
            <option value="Tamil Nadu">Tamil Nadu (including All India schemes)</option>
            <option value="All India">All India schemes only</option>
          </Select>
        </div>
        <div>
          <label htmlFor="benefit-eligibility-filter" className="mb-1.5 block text-xs font-medium text-neutral-600">
            Eligibility assessment
          </label>
          <Select
            id="benefit-eligibility-filter"
            value={eligibilityFilter}
            onChange={event => setEligibilityFilter(event.target.value)}
            disabled={tab === 'saved' || tab === 'all'}
          >
            <option value="">All assessments</option>
            <option value="eligible">Appears eligible</option>
            <option value="more_info_needed">More information needed</option>
            <option value="not_eligible">Does not meet a mandatory condition</option>
          </Select>
        </div>
        {hasActiveFilters && (
          <div className="sm:col-span-3">
            <button type="button" onClick={clearFilters} className="text-xs font-medium text-blue-700 hover:text-blue-900">
              Clear filters
            </button>
          </div>
        )}
      </div>

      {!loading && (
        <p className="text-sm text-neutral-500">
          Showing {filteredDisplayed.length} of {displayed.length} {displayed.length === 1 ? 'scholarship' : 'scholarships'}
        </p>
      )}

      {loading ? (
        <div className="grid md:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <EmptyState icon={<Star size={22} />} title="Benefits are temporarily unavailable" description={error} />
      ) : tab === 'recommended' ? (
        <section aria-labelledby="potential-benefits-title" className="space-y-4">
          <div className="rounded-2xl border border-navy-100 bg-gradient-to-br from-white to-navy-50/60 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-100 text-navy-700">
                <Star size={18} />
              </div>
              <div>
                <h2 id="potential-benefits-title" className="text-lg font-semibold text-neutral-900">
                  Your Potential Scholarship Benefits
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-neutral-600">
                  KNN ranks schemes by distance from your saved profile; eligibility is checked separately against published rules. Amounts are shown individually and are not added together.
                </p>
              </div>
            </div>
          </div>
          {filteredDisplayed.length === 0 ? (
            <EmptyState
              icon={<Star size={22} />}
              title={hasActiveFilters
                ? 'No scholarships match these filters'
                : benefits.length === 0
                ? 'No verified scholarship records are available'
                : 'No verified schemes match your profile yet'}
              description={hasActiveFilters
                ? 'Clear or adjust your selections to see other scholarship records.'
                : benefits.length === 0
                ? 'The connected catalogue currently contains no verified scheme records, so the recommendation engine has nothing authentic to assess. Recommendations will appear after an administrator adds records with verified criteria and official links.'
                : 'Verified records exist, but none currently pass the recommendation filters for your saved profile. Review your education, location and income details; eligibility is not inferred from similarity alone.'}
              action={hasActiveFilters
                ? <Button size="sm" variant="secondary" onClick={clearFilters}>Clear filters</Button>
                : <Link to="/dashboard/profile"><Button size="sm">Review profile</Button></Link>}
            />
          ) : (
            <div className="grid md:grid-cols-2 gap-5">
              {filteredDisplayed.map(benefit => <BenefitCard key={benefit.id} benefit={benefit} />)}
            </div>
          )}
        </section>
      ) : filteredDisplayed.length === 0 ? (
        <EmptyState
          icon={<Star size={22} />}
          title={hasActiveFilters
            ? 'No scholarships match these filters'
            : tab === 'saved' ? 'No saved benefits' : tab === 'all' && benefits.length === 0 ? 'No verified schemes are available yet' : 'No benefits in this category'}
          description={hasActiveFilters
            ? 'Clear or adjust your selections to see other scholarship records.'
            : tab === 'saved'
            ? 'Save verified benefits from the browse page to find them here quickly.'
            : benefits.length === 0
              ? 'The connected catalogue is empty. Records will appear here only after they have been verified against official sources.'
              : 'Review your profile and verified scheme criteria to find relevant benefits.'}
          action={hasActiveFilters
            ? <Button size="sm" variant="secondary" onClick={clearFilters}>Clear filters</Button>
            : tab === 'saved' ? <Link to="/search"><Button size="sm">Browse benefits</Button></Link> : undefined}
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {filteredDisplayed.map(b => <BenefitCard key={b.id} benefit={b} />)}
        </div>
      )}
    </div>
  );
}

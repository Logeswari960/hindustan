import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { benefitsApi } from '../services/api';
import type { Benefit, BenefitCategory, SearchFilters } from '../types';
import { Button, Input, SkeletonCard, EmptyState, Tabs, Select } from '../components/ui';
import { BenefitCard } from '../components/ui/domain';
import { backendConfigured, hasBackendSession } from '../services/backendClient';

const CATEGORIES: BenefitCategory[] = [
  'Education', 'Healthcare', 'Housing', 'Employment',
  'Financial Aid', 'Disability', 'Family Support', 'Skill Development',
];

const SORT_OPTIONS = [
  { value: 'match',    label: 'Best match' },
  { value: 'deadline', label: 'Deadline (soonest)' },
  { value: 'newest',   label: 'Recently added' },
];

const TABS = [
  { label: 'All',                value: 'all' },
  { label: 'Recommended',        value: 'recommended' },
  { label: 'Saved',              value: 'saved' },
  { label: 'Potentially eligible', value: 'potentially_eligible' },
];

export default function SearchPage() {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<Benefit[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [filters, setFilters]   = useState<SearchFilters>({ sort: 'match' });

  const doSearch = useCallback(async (q: string, f: SearchFilters) => {
    setLoading(true);
    setError(null);
    setRecommendationError(null);
    try {
      const data = await benefitsApi.getAll({ ...f, query: q });
      if (backendConfigured && hasBackendSession()) {
        try {
          const recommendations = await benefitsApi.getRecommendations();
          const byId = new Map(recommendations.map(benefit => [benefit.id, benefit]));
          setResults(data.map(benefit => ({ ...benefit, ...byId.get(benefit.id) })));
        } catch (requestError) {
          setRecommendationError(requestError instanceof Error ? requestError.message : 'Could not load recommendations.');
          setResults(data);
        }
      } else {
        setResults(data);
      }
    } catch (requestError) {
      setResults([]);
      setError(requestError instanceof Error ? requestError.message : 'Could not load benefits.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query, filters), 300);
    return () => clearTimeout(t);
  }, [query, filters, doSearch]);

  const setFilter = (key: keyof SearchFilters, value: string) =>
    setFilters(prev => ({ ...prev, [key]: value || undefined }));

  const clearAll = () => { setFilters({ sort: 'match' }); setQuery(''); };

  const activeFilterCount = Object.keys(filters).filter(k => k !== 'sort' && filters[k as keyof SearchFilters]).length;
  const emptyVerifiedCatalogue = backendConfigured && query.trim() === '' && activeFilterCount === 0 && results.length === 0;

  const displayed = results.filter(b => {
    if (activeTab === 'recommended') return b.matchScore > 0 && b.eligibilityStatus !== 'not_eligible';
    if (activeTab === 'saved') return b.isSaved;
    if (activeTab === 'potentially_eligible') return b.eligibilityStatus !== 'not_eligible';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Browse benefits</h1>
        <p className="text-neutral-500 text-sm mt-1">Search and filter programs that may be relevant to you.</p>
      </div>

      {/* Search bar */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search benefits, scholarships or support programs..."
            leftIcon={<Search size={15} />}
            rightElement={query ? (
              <button onClick={() => setQuery('')} className="text-neutral-400 hover:text-neutral-600 transition-colors" aria-label="Clear search">
                <X size={14} />
              </button>
            ) : undefined}
            className="h-10"
          />
        </div>
        <Button
          variant="secondary"
          icon={<SlidersHorizontal size={15} />}
          onClick={() => setShowFilters(!showFilters)}
          className="shrink-0 h-10"
        >
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 w-4 h-4 rounded-full bg-navy-700 text-white text-[10px] flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-5 animate-slide-up">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Category</label>
              <Select value={filters.category ?? ''} onChange={e => setFilter('category', e.target.value)}>
                <option value="">All categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Sort by</label>
              <Select value={filters.sort ?? 'match'} onChange={e => setFilter('sort', e.target.value)}>
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">Education level</label>
              <Select value={filters.education ?? ''} onChange={e => setFilter('education', e.target.value)}>
                <option value="">Any</option>
                <option value="secondary">Secondary</option>
                <option value="undergraduate">Undergraduate</option>
                <option value="postgraduate">Postgraduate</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">State</label>
              <Select value={filters.state ?? ''} onChange={e => setFilter('state', e.target.value)}>
                <option value="">All states</option>
                {[
                  'Andhra Pradesh', 'Assam', 'Bihar', 'Delhi', 'Gujarat', 'Karnataka',
                  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab',
                  'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'West Bengal',
                ].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </div>
          </div>
          {activeFilterCount > 0 && (
            <button onClick={clearAll} className="mt-3 text-xs text-navy-600 hover:text-navy-800 font-medium transition-colors">
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-5">
        <Tabs
          tabs={TABS.map(t => ({ ...t, count: t.value === 'all' ? results.length : undefined }))}
          active={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-sm text-neutral-500 mb-4">
          {displayed.length} {displayed.length === 1 ? 'result' : 'results'}
          {query && <> for "<span className="font-medium text-neutral-700">{query}</span>"</>}
        </p>
      )}

      {/* Results grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <EmptyState
          icon={<Search size={22} />}
          title="Benefits are temporarily unavailable"
          description={error}
          action={<Button variant="secondary" onClick={() => void doSearch(query, filters)}>Try again</Button>}
        />
      ) : activeTab === 'recommended' && recommendationError ? (
        <EmptyState icon={<Search size={22} />} title="Recommendations are unavailable" description={recommendationError} />
      ) : activeTab === 'recommended' && backendConfigured && !hasBackendSession() ? (
        <EmptyState icon={<Search size={22} />} title="Sign in to see recommendations" description="Create a profile and sign in to get relevant verified schemes." action={<Link to="/login"><Button>Sign in</Button></Link>} />
      ) : activeTab === 'potentially_eligible' && backendConfigured && !hasBackendSession() ? (
        <EmptyState icon={<Search size={22} />} title="Sign in to assess eligibility" description="Eligibility results are based on your saved profile and scheme rules." action={<Link to="/login"><Button>Sign in</Button></Link>} />
      ) : displayed.length === 0 ? (
        <EmptyState
          icon={<Search size={22} />}
          title={emptyVerifiedCatalogue ? 'No verified schemes are available yet' : 'No benefits found'}
          description={emptyVerifiedCatalogue
            ? 'The connected catalogue currently has no verified scheme records. Only records verified against official sources are shown here; illustrative data is not used as a real recommendation.'
            : 'Try adjusting your search terms or filters to find relevant programs.'}
          action={emptyVerifiedCatalogue
            ? hasBackendSession()
              ? <Link to="/dashboard/benefits"><Button variant="secondary">View My Benefits</Button></Link>
              : <Link to="/login"><Button variant="secondary">Sign in</Button></Link>
            : <Button variant="secondary" onClick={clearAll}>Clear filters</Button>}
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayed.map(b => <BenefitCard key={b.id} benefit={b} />)}
        </div>
      )}
    </div>
  );
}

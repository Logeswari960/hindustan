import { useEffect, useState } from 'react';
import { BookOpen, Clock } from 'lucide-react';
import { resourcesApi } from '../services/api';
import type { Resource } from '../types';
import { Card, Skeleton, EmptyState } from '../components/ui';

const categoryColors: Record<string, string> = {
  Scholarships: 'bg-blue-50 text-blue-700',
  Documents:    'bg-amber-50 text-amber-700',
  Platform:     'bg-teal-50 text-teal-700',
  Safety:       'bg-red-50 text-red-700',
  Eligibility:  'bg-violet-50 text-violet-700',
};

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    resourcesApi.getAll().then(r => { setResources(r); setLoading(false); });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-2xl mb-10">
        <h1 className="text-3xl font-bold text-neutral-900 mb-3">Resources</h1>
        <p className="text-neutral-500 leading-relaxed">
          Guides and information to help you understand the benefits landscape, prepare your documents, and navigate the application process.
        </p>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      ) : resources.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={22} />}
          title="No resources yet"
          description="Guides and articles will appear here soon."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {resources.map(r => (
            <Card key={r.id} hover className="p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${categoryColors[r.category] ?? 'bg-neutral-100 text-neutral-600'}`}>
                  {r.category}
                </span>
                <span className="text-xs text-neutral-400 flex items-center gap-1">
                  <Clock size={11} />{r.readTime}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-neutral-900 leading-snug mb-1.5">{r.title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed line-clamp-3">{r.description}</p>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
                <span className="text-xs text-neutral-400">{r.date}</span>
                <button className="text-xs font-medium text-navy-600 hover:text-navy-800 transition-colors">
                  Read guide →
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

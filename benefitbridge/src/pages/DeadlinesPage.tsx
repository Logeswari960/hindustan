import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { deadlinesApi } from '../services/api';
import type { Deadline } from '../types';
import { EmptyState, Skeleton } from '../components/ui';
import { DeadlineCard } from '../components/ui/domain';

export default function DeadlinesPage() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    deadlinesApi.getAll().then(d => { setDeadlines(d); setLoading(false); });
  }, []);

  const dueSoon  = deadlines.filter(d => d.daysRemaining <= 14 && !d.isCompleted);
  const upcoming = deadlines.filter(d => d.daysRemaining > 14 && d.daysRemaining <= 30 && !d.isCompleted);
  const later    = deadlines.filter(d => d.daysRemaining > 30 && !d.isCompleted);
  const completed = deadlines.filter(d => d.isCompleted);

  const Section = ({ title, items, accent }: { title: string; items: Deadline[]; accent?: string }) =>
    items.length === 0 ? null : (
      <div>
        <h2 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${accent ?? 'text-neutral-600'}`}>{title}</h2>
        <div className="space-y-3">
          {items.map(d => <DeadlineCard key={d.id} deadline={d} />)}
        </div>
      </div>
    );

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Deadlines</h1>
        <p className="text-neutral-500 text-sm mt-1">Track application deadlines for your matched benefits.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : deadlines.length === 0 ? (
        <EmptyState
          icon={<Clock size={22} />}
          title="No verified deadlines available"
          description="The current catalogue is illustrative and does not provide verified deadline data. No expired dates are shown as upcoming."
        />
      ) : (
        <>
          <Section title="Due soon — act now" items={dueSoon} accent="text-red-600" />
          <Section title="Upcoming" items={upcoming} accent="text-amber-600" />
          <Section title="Later" items={later} />
          <Section title="Completed" items={completed} />
        </>
      )}
    </div>
  );
}

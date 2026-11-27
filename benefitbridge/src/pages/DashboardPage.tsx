import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Star, FileText, Clock, ArrowRight, CheckCircle, AlertCircle, ChevronRight, ClipboardList } from 'lucide-react';
import { dashboardApi, benefitsApi, profileApi } from '../services/api';
import type { Benefit, DashboardStats, UserProfile } from '../types';
import { Card, Button, SkeletonCard, Skeleton, EmptyState } from '../components/ui';
import { BenefitCard } from '../components/ui/domain';
import { deadlinesApi, notificationsApi, profileFieldsApi } from '../services/api';
import type { Deadline, Notification, ProfileField } from '../types';

function StatCard({ label, value, icon: Icon, accent, href }: {
  label: string; value: number; icon: React.ElementType; accent: string; href: string;
}) {
  return (
    <Link to={href}>
      <Card hover className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent}`}>
            <Icon size={18} />
          </div>
          <ChevronRight size={14} className="text-neutral-300" />
        </div>
        <p className="text-3xl font-bold text-neutral-900 mb-0.5">{value}</p>
        <p className="text-sm text-neutral-500">{label}</p>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [verifiedSchemeCount, setVerifiedSchemeCount] = useState(0);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [profileFields, setProfileFields] = useState<ProfileField[]>([]);

  useEffect(() => {
    Promise.all([
      benefitsApi.getRecommendations(),
      benefitsApi.getAll(),
      dashboardApi.getStats(),
      profileApi.get(),
      deadlinesApi.getAll(),
      notificationsApi.getAll(),
      profileFieldsApi.get(),
    ])
      .then(([b, catalogue, s, u, d, n, fields]) => {
        setBenefits(b);
        setVerifiedSchemeCount(catalogue.length);
        setStats(s);
        setUser(u);
        setDeadlines(d);
        setNotifications(n);
        setProfileFields(fields);
      })
      .catch(requestError => setError(requestError instanceof Error ? requestError.message : 'Could not load dashboard data.'))
      .finally(() => setLoading(false));
  }, []);

  const unread = notifications.filter(n => !n.isRead);
  const missingFields = profileFields.filter(f => f.status === 'missing');

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl">
      <div>
        {loading ? <Skeleton className="h-8 w-52 mb-1" /> : (
          <h1 className="text-2xl font-bold text-neutral-900">
            {user?.firstName ? `Welcome, ${user.firstName}` : 'Welcome to your dashboard'}
          </h1>
        )}
        <p className="text-neutral-500 text-sm mt-1">Here's what needs your attention.</p>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Dashboard data could not be loaded: {error}
        </div>
      )}

      {!loading && unread.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800">{unread[0].title}</p>
            <p className="text-xs text-amber-700 mt-0.5">{unread[0].message}</p>
          </div>
          {unread[0].actionUrl && (
            <Link to={unread[0].actionUrl}>
              <Button variant="secondary" size="sm" className="shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100">
                {unread[0].actionLabel}
              </Button>
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />) : stats ? (
          <>
            <StatCard label="Available scholarships" value={verifiedSchemeCount} icon={Star} accent="bg-blue-50 text-blue-600" href="/search" />
            <StatCard label="Potential benefits"       value={stats.potentialBenefits}     icon={TrendingUp} accent="bg-navy-50 text-navy-600"     href="/dashboard/benefits" />
            <StatCard label="Appears eligible"         value={stats.eligibleBenefits}      icon={CheckCircle} accent="bg-emerald-50 text-emerald-600" href="/dashboard/eligibility" />
            <StatCard label="Needs more information"   value={stats.moreInfoRequired}      icon={AlertCircle} accent="bg-amber-50 text-amber-600"    href="/dashboard/eligibility" />
            <StatCard label="High-relevance opportunities" value={stats.highMatchOpportunities} icon={Star}       accent="bg-emerald-50 text-emerald-600" href="/dashboard/benefits" />
            <StatCard label="Saved benefits"           value={stats.savedBenefits}          icon={Star}       accent="bg-navy-50 text-navy-600"       href="/dashboard/benefits" />
            <StatCard label="Documents uploaded"       value={stats.uploadedDocuments}      icon={FileText}   accent="bg-blue-50 text-blue-600"       href="/dashboard/documents" />
            <StatCard label="Documents needed"         value={stats.documentsNeeded}        icon={FileText}   accent="bg-amber-50 text-amber-600"    href="/dashboard/documents" />
            <StatCard label="Upcoming deadlines"       value={stats.upcomingDeadlines}      icon={Clock}      accent="bg-rose-50 text-rose-600"      href="/dashboard/deadlines" />
            <StatCard label="Applications in progress" value={stats.applicationsInProgress} icon={ClipboardList} accent="bg-violet-50 text-violet-600" href="/dashboard/applications" />
          </>
        ) : null}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-neutral-800">Your Potential Scholarship Benefits</h2>
              <p className="mt-1 text-xs text-neutral-500">Amounts are shown individually when published; they are not added together or guaranteed.</p>
            </div>
            <Link to="/dashboard/benefits">
              <Button variant="ghost" size="sm" icon={<ArrowRight size={14} />} iconPosition="right">View all</Button>
            </Link>
          </div>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
            : benefits.length === 0
            ? <EmptyState
                icon={<Star size={20} />}
                title={verifiedSchemeCount === 0 ? 'No verified scholarship records are available' : 'No verified schemes match your profile yet'}
                description={verifiedSchemeCount === 0
                  ? 'The connected catalogue is empty, so no authentic recommendation can be generated. An administrator must add and verify scheme criteria and official links before recommendations can appear.'
                  : 'Verified schemes exist, but none currently pass the profile and recommendation filters. Similarity is not an eligibility decision.'}
                action={<Link to="/dashboard/profile"><Button size="sm">Review profile</Button></Link>}
              />
            : <>
                {benefits.slice(0, 3).map(b => <BenefitCard key={b.id} benefit={b} />)}
                {benefits.length > 3 && (
                  <Link to="/dashboard/benefits" className="block text-center text-sm font-medium text-navy-700 hover:text-navy-900">
                    View all {benefits.length} potential benefits
                  </Link>
                )}
              </>
          }
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-neutral-800">Profile completion</h3>
              <span className="text-sm font-bold text-navy-700">{user?.completionPercent ?? 0}%</span>
            </div>
            <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden mb-4">
              <div className="h-full bg-navy-600 rounded-full" style={{ width: `${user?.completionPercent ?? 0}%` }} />
            </div>
            <div className="space-y-2.5">
              {profileFields.map(field => (
                <div key={field.key} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {field.status === 'complete'
                      ? <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                      : <AlertCircle size={13} className="text-amber-500 shrink-0" />}
                    <span className="text-sm text-neutral-700 truncate">{field.label}</span>
                  </div>
                  <span className={`text-xs font-medium shrink-0 ${field.status === 'complete' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {field.status === 'complete' ? 'Done' : 'Missing'}
                  </span>
                </div>
              ))}
              {deadlines.length === 0 && (
                <p className="text-sm text-neutral-500">No active deadlines are available for the verified schemes.</p>
              )}
            </div>
            {missingFields.length > 0 && (
              <Link to="/dashboard/profile" className="block mt-4">
                <Button size="sm" fullWidth>Complete profile</Button>
              </Link>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-neutral-800">Upcoming deadlines</h3>
              <Link to="/dashboard/deadlines"><Button variant="ghost" size="sm">View all</Button></Link>
            </div>
            <div className="space-y-3">
              {deadlines.slice(0, 3).map(d => (
                <div key={d.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-800 leading-snug line-clamp-1">{d.benefitName}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{d.date}</p>
                  </div>
                  <div className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-lg whitespace-nowrap
                    ${d.daysRemaining <= 14 ? 'bg-red-50 text-red-700' : d.daysRemaining <= 21 ? 'bg-amber-50 text-amber-700' : 'bg-neutral-100 text-neutral-600'}`}>
                    {d.daysRemaining}d
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

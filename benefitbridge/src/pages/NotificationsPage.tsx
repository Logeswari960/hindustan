import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Clock, FileText, Star, ClipboardList, User, CheckCheck } from 'lucide-react';
import { notificationsApi } from '../services/api';
import type { Notification } from '../types';
import { Button, Card, EmptyState, Skeleton, Toast } from '../components/ui';

const typeIcon: Record<Notification['type'], React.ElementType> = {
  deadline:    Clock,
  document:    FileText,
  new_benefit: Star,
  application: ClipboardList,
  profile:     User,
};

const typeAccent: Record<Notification['type'], string> = {
  deadline:    'bg-red-50 text-red-600',
  document:    'bg-amber-50 text-amber-600',
  new_benefit: 'bg-emerald-50 text-emerald-600',
  application: 'bg-blue-50 text-blue-600',
  profile:     'bg-violet-50 text-violet-600',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    notificationsApi.getAll()
      .then(setNotifications)
      .catch(() => setToast('Could not load notifications.'))
      .finally(() => setLoading(false));
  }, []);

  const markAllRead = async () => {
    await notificationsApi.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };
  const markRead = async (id: string) => {
    await notificationsApi.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };
  const dismiss = async (id: string) => {
    await notificationsApi.dismiss(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Notifications</h1>
          <p className="text-neutral-500 text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" icon={<CheckCheck size={14} />} onClick={markAllRead}>
            Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-xl" />)}</div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell size={22} />}
          title="No notifications"
          description="No notifications have been generated for your saved demo data."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const Icon = typeIcon[n.type];
            return (
              <Card
                key={n.id}
                className={`p-4 flex items-start gap-4 transition-all ${!n.isRead ? 'border-navy-200 bg-navy-50/30' : ''}`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${typeAccent[n.type]}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${!n.isRead ? 'text-neutral-900' : 'text-neutral-700'}`}>{n.title}</p>
                    <span className="text-xs text-neutral-400 shrink-0">{n.date}</span>
                  </div>
                  <p className="text-sm text-neutral-500 mt-0.5 leading-relaxed">{n.message}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {n.actionUrl && n.actionLabel && (
                      <Link to={n.actionUrl} onClick={() => markRead(n.id)}>
                        <Button variant="ghost" size="sm" className="text-navy-600 hover:text-navy-800 px-0 h-auto">
                          {n.actionLabel} →
                        </Button>
                      </Link>
                    )}
                    {!n.isRead && (
                      <button onClick={() => markRead(n.id)} className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors">
                        Mark as read
                      </button>
                    )}
                    <button onClick={() => dismiss(n.id)} className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors">
                      Dismiss
                    </button>
                  </div>
                </div>
                {!n.isRead && (
                  <div className="w-2 h-2 rounded-full bg-navy-600 shrink-0 mt-1.5" aria-label="Unread" />
                )}
              </Card>
            );
          })}
        </div>
      )}
      {toast && <Toast message={toast} type="info" onClose={() => setToast(null)} />}
    </div>
  );
}

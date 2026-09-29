import { useMemo } from 'react';
import { AlertTriangle, Bell, Check, CircleAlert, Info, Megaphone, ShieldCheck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getListNotificationsQueryKey, useListNotifications, useMarkNotificationRead } from '@workspace/api-client-react';
import type { Notification } from '@workspace/api-client-react';
import { EmptyState, ErrorState, PageHeading } from '@/components/acims-ui';

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const notificationsQuery = useListNotifications({ query: { queryKey: getListNotificationsQueryKey() } });
  const markRead = useMarkNotificationRead();
  const notifications = useMemo(() => notificationsQuery.data?.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) ?? [], [notificationsQuery.data]);
  const unread = notifications.filter((item) => !item.read).length;
  const handleRead = (notification: Notification) => { if (notification.read) return; markRead.mutate({ data: { id: notification.id } }, { onSuccess: (updated) => { queryClient.setQueryData<Notification[]>(getListNotificationsQueryKey(), (old) => old?.map((item) => item.id === updated.id ? updated : item)); } }); };
  return <div className="page-in"><PageHeading eyebrow="Smart alerts" title="Know before you go." description="Short, useful updates from the transport desk. We keep the important bits close and the noise out." action={<div className="rounded-full border border-border bg-card px-3 py-2 text-[11px] font-bold"><span data-testid="text-unread-count">{unread}</span> unread</div>} />
    {notificationsQuery.isLoading ? <div className="space-y-3"><div className="skeleton h-28 rounded-[22px]" /><div className="skeleton h-28 rounded-[22px]" /><div className="skeleton h-28 rounded-[22px]" /></div> : notificationsQuery.isError ? <ErrorState onRetry={() => void notificationsQuery.refetch()} /> : !notifications.length ? <EmptyState icon={Bell} title="Your alerts are clear" message="When something changes on your route, it will land here with the time and the why." /> : <section className="max-w-3xl space-y-3">{notifications.map((notification, index) => <AlertRow key={notification.id} notification={notification} index={index} onRead={() => handleRead(notification)} />)}</section>}
  </div>;
}

function AlertRow({ notification, index, onRead }: { notification: Notification; index: number; onRead: () => void }) {
  const Icon = notification.type.toLowerCase().includes('delay') ? AlertTriangle : notification.type.toLowerCase().includes('safety') ? ShieldCheck : notification.type.toLowerCase().includes('service') ? Megaphone : Info;
  const timestamp = new Date(notification.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return <article className={`slide-in group relative flex gap-4 rounded-[22px] border p-5 transition ${notification.read ? 'border-border bg-card' : 'border-primary/20 bg-card soft-shadow'}`} style={{ animationDelay: `${index * 60}ms` }} data-testid={`card-alert-${notification.id}`}><div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${notification.read ? 'bg-muted text-muted-foreground' : 'bg-accent text-accent-foreground'}`}><Icon size={18} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className={`text-sm font-extrabold ${notification.read ? 'text-muted-foreground' : 'text-foreground'}`}>{notification.title}</h2>{!notification.read && <span className="rounded-full bg-accent px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider">New</span>}<span className="ml-auto text-[10px] font-bold text-muted-foreground">{timestamp}</span></div><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{notification.message}</p><div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-muted-foreground"><span className="rounded-md bg-muted px-2 py-1">{notification.busId ? `Route ${notification.busId}` : 'Campus transit'}</span>{!notification.read && <button type="button" onClick={onRead} disabled={false} data-testid={`button-mark-read-${notification.id}`} className="inline-flex items-center gap-1 rounded-md px-2 py-1 transition hover:bg-muted hover:text-foreground"><Check size={12} /> Mark read</button>}{notification.read && <span className="inline-flex items-center gap-1"><Check size={12} /> Read</span>}</div></div></article>;
}
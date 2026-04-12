import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, AlertTriangle, Info, Bell, CheckCheck, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotificationStore, type Notification } from '@/stores/notificationStore';

const typeIcons = {
  success: { icon: CheckCircle, className: 'text-emerald-500' },
  error: { icon: XCircle, className: 'text-red-500' },
  warning: { icon: AlertTriangle, className: 'text-amber-500' },
  info: { icon: Info, className: 'text-blue-500' },
};

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return '< 1 min';
  if (diffMin < 60) return `${diffMin} min`;
  if (diffHour < 24) return `${diffHour} h`;
  return date.toLocaleDateString();
}

function NotificationItem({ notification }: { notification: Notification }) {
  const config = typeIcons[notification.type];
  const Icon = config.icon;

  return (
    <div
      className={`flex items-start gap-2.5 rounded-md px-3 py-2 transition-colors ${
        notification.read ? 'opacity-60' : 'bg-accent/50'
      }`}
    >
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.className}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight">{notification.title}</p>
        {notification.message && (
          <p className="text-xs text-muted-foreground mt-0.5">{notification.message}</p>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">{formatTimestamp(notification.timestamp)}</p>
      </div>
    </div>
  );
}

export default function NotificationPanel() {
  const { t } = useTranslation();
  const { notifications, markAllRead, clearAll, unreadCount } = useNotificationStore();
  const count = unreadCount();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-7 w-7"
        >
          <Bell className="h-3.5 w-3.5" />
          {count > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] leading-none flex items-center justify-center"
            >
              {count > 99 ? '99+' : count}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="top" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <h4 className="text-sm font-medium">{t('notification.title')}</h4>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={markAllRead}
              disabled={count === 0}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              {t('notification.markAllRead')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={clearAll}
              disabled={notifications.length === 0}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              {t('notification.clearAll')}
            </Button>
          </div>
        </div>
        <ScrollArea className="max-h-80">
          <div className="flex flex-col gap-0.5 p-2">
            {notifications.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t('notification.noNotifications')}
              </p>
            ) : (
              notifications.map((n) => <NotificationItem key={n.id} notification={n} />)
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

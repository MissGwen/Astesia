import { useEffect, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useNotificationStore, type Notification } from '@/stores/notificationStore';

const TOAST_DURATION = 5000;

const typeConfig = {
  success: {
    icon: CheckCircle,
    className: 'text-emerald-500',
    barColor: 'bg-emerald-500',
  },
  error: {
    icon: XCircle,
    className: 'text-red-500',
    barColor: 'bg-red-500',
  },
  warning: {
    icon: AlertTriangle,
    className: 'text-amber-500',
    barColor: 'bg-amber-500',
  },
  info: {
    icon: Info,
    className: 'text-blue-500',
    barColor: 'bg-blue-500',
  },
};

function ToastItem({ notification, onDismiss }: { notification: Notification; onDismiss: (id: string) => void }) {
  const [progress, setProgress] = useState(100);
  const [exiting, setExiting] = useState(false);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(notification.id), 200);
  }, [notification.id, onDismiss]);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / TOAST_DURATION) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        dismiss();
      }
    }, 50);
    return () => clearInterval(interval);
  }, [dismiss]);

  const config = typeConfig[notification.type];
  const Icon = config.icon;

  return (
    <div
      className={`relative flex w-80 flex-col overflow-hidden rounded-lg border bg-card shadow-lg transition-all duration-200 ${
        exiting ? 'translate-x-4 opacity-0' : 'translate-x-0 opacity-100 animate-in slide-in-from-bottom-2'
      }`}
    >
      <div className="flex items-start gap-3 p-3">
        <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${config.className}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-card-foreground">{notification.title}</p>
          {notification.message && (
            <p className="mt-0.5 text-xs text-muted-foreground">{notification.message}</p>
          )}
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-sm p-0.5 text-muted-foreground opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="h-0.5 w-full bg-muted">
        <div
          className={`h-full transition-all duration-100 ease-linear ${config.barColor}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function ToastContainer() {
  const [visibleToasts, setVisibleToasts] = useState<Notification[]>([]);
  const shownIdsRef = useRef<Set<string>>(new Set());
  const notifications = useNotificationStore((s) => s.notifications);
  const markRead = useNotificationStore((s) => s.markRead);

  // Only show toasts for notifications that haven't been shown yet.
  // This prevents re-popping when markAllRead mutates the array.
  useEffect(() => {
    if (notifications.length === 0) return;
    const newNotifications = notifications.filter(
      (n) => !shownIdsRef.current.has(n.id)
    );
    if (newNotifications.length === 0) return;
    newNotifications.forEach((n) => shownIdsRef.current.add(n.id));
    setVisibleToasts((prev) => [...newNotifications, ...prev].slice(0, 5));
  }, [notifications]);

  const handleDismiss = useCallback((id: string) => {
    setVisibleToasts((prev) => prev.filter((t) => t.id !== id));
    // Mark the notification as read when user dismisses the toast
    markRead(id);
  }, [markRead]);

  if (visibleToasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {visibleToasts.map((toast) => (
        <ToastItem key={toast.id} notification={toast} onDismiss={handleDismiss} />
      ))}
    </div>
  );
}

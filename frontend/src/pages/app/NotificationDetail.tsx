import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ChevronLeft,
  Bell,
  Check,
  Copy,
  AlertCircle,
  Radio,
  Mail,
  MessageSquare,
  Clock,
  Activity,
} from 'lucide-react';
import { notificationsApi } from '../../services/notifications.api';
import {
  Notification,
  NotificationDeliveryAttempt,
  Channel,
} from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { JsonViewer } from '../../components/ui/JsonViewer';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { formatDate, formatRelativeTime, copyToClipboard } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';

export const NotificationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const [notification, setNotification] = useState<Notification | null>(null);
  const [attempts, setAttempts] = useState<NotificationDeliveryAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchNotificationAndAttempts = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [notifRes, attemptsRes] = await Promise.all([
        notificationsApi.getNotification(id),
        notificationsApi.getAttempts(id),
      ]);
      setNotification(notifRes.data);
      setAttempts(attemptsRes.data || []);
    } catch (err: any) {
      toast.error('Failed to load notification details', err?.error?.message);
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchNotificationAndAttempts();
  }, [fetchNotificationAndAttempts]);

  const handleCopy = async (text: string, key: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const getChannelIcon = (ch: Channel) => {
    switch (ch) {
      case Channel.WhatsApp:
        return <Radio className="w-4 h-4 text-emerald-400" />;
      case Channel.Email:
        return <Mail className="w-4 h-4 text-sky-400" />;
      case Channel.Sms:
        return <MessageSquare className="w-4 h-4 text-amber-400" />;
      default:
        return <Bell className="w-4 h-4 text-indigo-400" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-slate-800 rounded animate-pulse" />
        <div className="h-48 bg-slate-900/60 rounded-2xl border border-slate-800 animate-pulse" />
        <TableSkeleton rows={3} columns={5} />
      </div>
    );
  }

  if (!notification) {
    return (
      <div className="p-8 text-center text-slate-400 space-y-3">
        <p>Notification record not found.</p>
        <Button asChild variant="outline">
          <Link to="/notifications">Return to History</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Back Link */}
      <Link
        to="/notifications"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to Notification History</span>
      </Link>

      {/* Header Summary Card */}
      <Card className="p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-sm font-semibold text-slate-200">
                {notification.id}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(notification.id, 'id')}
                className="p-1 text-slate-500 hover:text-slate-300"
                title="Copy ID"
              >
                {copiedKey === 'id' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <StatusBadge status={notification.status} type="notification" />
            </div>
            <p className="text-xs text-slate-400">
              Dispatched {formatRelativeTime(notification.created_at)} ({formatDate(notification.created_at)})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 flex items-center gap-2">
              {getChannelIcon(notification.channel)}
              <span className="font-semibold capitalize">{notification.channel}</span>
            </div>
          </div>
        </div>

        {/* 6-Column Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-500 block mb-0.5">Tenant ID</span>
            <span className="font-mono font-semibold text-indigo-300">
              {notification.tenant_id}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block mb-0.5">Event Key</span>
            <span className="font-mono font-semibold text-slate-200">
              {notification.event}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block mb-0.5">Recipient</span>
            <span className="font-mono font-semibold text-slate-200">
              {notification.recipient}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block mb-0.5">Provider</span>
            <span className="font-semibold capitalize text-slate-200">
              {notification.provider || 'meta'}
            </span>
          </div>

          <div className="sm:col-span-2">
            <span className="text-slate-500 block mb-0.5">Provider Message ID</span>
            {notification.provider_message_id ? (
              <div className="flex items-center gap-1.5 font-mono text-emerald-400 truncate">
                <span className="truncate">{notification.provider_message_id}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(notification.provider_message_id!, 'provider_id')}
                  className="p-1 text-slate-500 hover:text-slate-300 flex-shrink-0"
                >
                  {copiedKey === 'provider_id' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ) : (
              <span className="text-slate-600">—</span>
            )}
          </div>
        </div>

        {/* Error Callout if Failed */}
        {notification.error_message && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-rose-400">
              <AlertCircle className="w-4 h-4" />
              <span>Delivery Failure: {notification.error_code || 'PROVIDER_REJECTED'}</span>
            </div>
            <p className="leading-relaxed opacity-90">{notification.error_message}</p>
          </div>
        )}
      </Card>

      {/* Delivery Attempts Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>Delivery Lifecycle & Attempts ({attempts.length})</span>
          </h3>
        </div>

        <Card className="overflow-hidden p-0">
          {attempts.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No additional attempt logs recorded.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800/80">
                <thead className="bg-slate-950/70 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4"># Attempt</th>
                    <th className="py-3.5 px-4">Timestamp</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Error Code</th>
                    <th className="py-3.5 px-4">Response Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {attempts.map((attempt) => (
                    <tr key={attempt.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-200">
                        #{attempt.attempt_number}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {formatDate(attempt.created_at)}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={attempt.status} type="notification" />
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {attempt.error_code || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                        {attempt.error_message ? (
                          <span className="text-rose-400">{attempt.error_message}</span>
                        ) : (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            <span>OK (Provider Accepted)</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Payloads & Metadata Inspection */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-200">Payload Metadata</h3>

        <div className="space-y-3">
          <JsonViewer
            data={notification.request_metadata}
            title="SaaS Dispatched Request Payload & Dynamic Variables"
            defaultOpen
          />

          <JsonViewer
            data={notification.response_metadata}
            title="Provider Raw Response & Webhook Updates"
            defaultOpen={Boolean(notification.response_metadata)}
          />
        </div>
      </div>
    </div>
  );
};

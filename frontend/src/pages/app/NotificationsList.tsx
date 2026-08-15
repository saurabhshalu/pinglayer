import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Filter,
  RefreshCw,
  Copy,
  Check,
  Eye,
  Radio,
  Mail,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { notificationsApi } from '../../services/notifications.api';
import {
  Notification,
  NotificationStatus,
  Channel,
  Pagination as PaginationType,
} from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Pagination } from '../../components/ui/Pagination';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { SendTestNotificationModal } from '../../components/modals/SendTestNotificationModal';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { formatDate, truncate, copyToClipboard } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';

export const NotificationsList: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [tenantIdFilter, setTenantIdFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<NotificationStatus | ''>('');
  const [eventFilter, setEventFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState<Channel | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Modals & Clipboards
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchNotifications = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const res = await notificationsApi.listNotifications({
          page,
          limit: 10,
          tenantId: tenantIdFilter || undefined,
          status: statusFilter || undefined,
          event: eventFilter ? eventFilter.toUpperCase() : undefined,
          channel: channelFilter || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        });
        setNotifications(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } catch (err: any) {
        toast.error('Failed to load notifications', err?.error?.message || 'Error occurred');
      } finally {
        setLoading(false);
      }
    },
    [tenantIdFilter, statusFilter, eventFilter, channelFilter, fromDate, toDate, toast]
  );

  useEffect(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);

  const handleCopy = async (text: string, id: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const clearFilters = () => {
    setTenantIdFilter('');
    setStatusFilter('');
    setEventFilter('');
    setChannelFilter('');
    setFromDate('');
    setToDate('');
  };

  const getChannelIcon = (ch: Channel) => {
    switch (ch) {
      case Channel.WhatsApp:
        return <Radio className="w-3.5 h-3.5 text-emerald-400" />;
      case Channel.Email:
        return <Mail className="w-3.5 h-3.5 text-sky-400" />;
      case Channel.Sms:
        return <MessageSquare className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-indigo-400" />
            <span>Notification Delivery History</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time delivery lifecycle logs, provider statuses, and webhook tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchNotifications(pagination.page)}
            title="Refresh Logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            onClick={() => setTestModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Send Test Notification</span>
          </Button>
        </div>
      </div>

      {/* Filter Bar Card */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Filter className="w-3.5 h-3.5 text-indigo-400" />
          <span>Filter Delivery Records</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Tenant ID</label>
            <input
              type="text"
              value={tenantIdFilter}
              onChange={(e) => setTenantIdFilter(e.target.value)}
              placeholder="e.g. merchant-123"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Event Key</label>
            <input
              type="text"
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value.toUpperCase())}
              placeholder="ORDER_SHIPPED"
              className="w-full font-mono uppercase bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as NotificationStatus | '')}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-500 outline-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value={NotificationStatus.Queued}>Queued</option>
              <option value={NotificationStatus.Processing}>Processing</option>
              <option value={NotificationStatus.Sent}>Sent</option>
              <option value={NotificationStatus.Delivered}>Delivered</option>
              <option value={NotificationStatus.Read}>Read</option>
              <option value={NotificationStatus.Failed}>Failed</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Channel</label>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value as Channel | '')}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-500 outline-none cursor-pointer"
            >
              <option value="">All Channels</option>
              <option value={Channel.WhatsApp}>WhatsApp</option>
              <option value={Channel.Email}>Email</option>
              <option value={Channel.Sms}>SMS</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs text-slate-400 hover:text-slate-200 font-medium transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </Card>

      {/* Notifications Table Card */}
      <Card className="overflow-hidden p-0">
        {loading ? (
          <TableSkeleton rows={5} columns={8} />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="w-8 h-8 text-indigo-400" />}
            title="No notifications recorded"
            description="Trigger a notification using the test dispatcher or from your backend API."
            action={{
              label: 'Send Test Notification',
              onClick: () => setTestModalOpen(true),
              icon: <Sparkles className="w-4 h-4" />,
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800/80">
              <thead className="bg-slate-950/70 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4">Tenant ID</th>
                  <th className="py-3.5 px-4">Event</th>
                  <th className="py-3.5 px-4">Channel</th>
                  <th className="py-3.5 px-4">Recipient</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Provider Msg ID</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {notifications.map((notif) => (
                  <tr
                    key={notif.id}
                    onClick={() => navigate(`/notifications/${notif.id}`)}
                    className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                      {formatDate(notif.created_at)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-indigo-300">
                      {notif.tenant_id}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                        {notif.event}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center gap-1.5 capitalize font-medium">
                        {getChannelIcon(notif.channel)}
                        <span>{notif.channel}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-200">
                      {notif.recipient}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={notif.status} type="notification" />
                      {notif.error_message && (
                        <p className="text-[10px] text-rose-400 truncate max-w-[140px] mt-0.5">
                          {notif.error_message}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {notif.provider_message_id ? (
                        <div className="inline-flex items-center gap-1">
                          <span>{truncate(notif.provider_message_id, 12)}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(notif.provider_message_id!, notif.id);
                            }}
                            className="p-1 text-slate-500 hover:text-slate-300"
                            title="Copy ID"
                          >
                            {copiedId === notif.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/notifications/${notif.id}`);
                        }}
                        className="inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                        <span>View</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <Pagination pagination={pagination} onPageChange={(p) => fetchNotifications(p)} />
      </Card>

      {/* Test Notification Modal */}
      <SendTestNotificationModal
        isOpen={testModalOpen}
        onClose={() => {
          setTestModalOpen(false);
          fetchNotifications(1);
        }}
      />
    </div>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  RefreshCw,
  Copy,
  Check,
  Eye,
  Radio,
  Mail,
  MessageSquare,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { notificationsApi } from '../../services/notifications.api';
import { productsApi } from '../../services/products.api';
import {
  Notification,
  NotificationStatus,
  Channel,
  Product,
  Pagination as PaginationType,
} from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { JsonViewer } from '../../components/ui/JsonViewer';
import { TenantDisplay } from '../../components/ui/TenantDisplay';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { formatDate, truncate, copyToClipboard } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';

export const AdminNotifications: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [loading, setLoading] = useState(false);

  // Filters
  const [tenantIdFilter, setTenantIdFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<NotificationStatus | ''>('');
  const [eventFilter, setEventFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState<Channel | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Inspect Modal
  const [inspectNotification, setInspectNotification] = useState<Notification | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { toast } = useToast();

  const activeFilterCount = [tenantIdFilter, eventFilter, statusFilter, channelFilter, fromDate, toDate].filter(Boolean).length;

  const handleClearFilters = () => {
    setTenantIdFilter('');
    setEventFilter('');
    setStatusFilter('');
    setChannelFilter('');
    setFromDate('');
    setToDate('');
  };

  // Fetch products first to set default selected product
  useEffect(() => {
    productsApi
      .listProducts({ limit: 100 })
      .then((res) => {
        const prods = res.data || [];
        setProducts(prods);
        if (prods.length > 0 && !selectedProductId) {
          setSelectedProductId(prods[0].id);
        }
      })
      .catch((err) => {
        toast.error('Failed to load products', err?.error?.message);
      });
  }, []);

  const fetchNotifications = useCallback(
    async (page = 1) => {
      if (!selectedProductId) return;
      setLoading(true);
      try {
        const res = await notificationsApi.listAllNotifications({
          productId: selectedProductId,
          page,
          limit: 20,
          tenantId: tenantIdFilter.trim() || undefined,
          status: statusFilter || undefined,
          event: eventFilter.trim() ? eventFilter.toUpperCase() : undefined,
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
    [selectedProductId, tenantIdFilter, statusFilter, eventFilter, channelFilter, fromDate, toDate, toast]
  );

  useEffect(() => {
    if (selectedProductId) {
      fetchNotifications(1);
    }
  }, [selectedProductId, fetchNotifications]);

  const handleCopy = async (text: string, id: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-indigo-400" />
            <span>All Notifications Log</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Global delivery logs, provider statuses, and error tracking across products.
          </p>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => fetchNotifications(pagination.page)}
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Product Selector & Filters */}
      <Card className="p-4 space-y-4">
        {/* Required Product Selector Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span>Target SaaS Product (Required):</span>
          </div>
          <div className="w-full sm:w-80">
            <Select
              value={selectedProductId || (products[0]?.id ?? '')}
              onValueChange={(val) => setSelectedProductId(val)}
            >
              <SelectTrigger className="border-indigo-500/40 text-indigo-200 font-semibold">
                <SelectValue placeholder={products.length === 0 ? "Loading products..." : "Select Product"} />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem
                    key={p.id}
                    value={p.id}
                    label={p.name}
                    sublabel={`slug: ${p.slug}`}
                  />
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Mobile Filter Toggle */}
        <div className="flex items-center justify-between md:hidden">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white"
          >
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span>{mobileFiltersOpen ? 'Hide Filter Options' : 'Show Filter Options'}</span>
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                {activeFilterCount} active
              </span>
            )}
          </button>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Secondary Filter Inputs */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs ${mobileFiltersOpen ? 'grid' : 'hidden md:grid'}`}>
          {/* Tenant */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Tenant ID</label>
            <input
              type="text"
              value={tenantIdFilter}
              onChange={(e) => setTenantIdFilter(e.target.value)}
              placeholder="e.g. merchant-123"
              className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none"
            />
          </div>

          {/* Event */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Event Key</label>
            <input
              type="text"
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value.toUpperCase())}
              placeholder="ORDER_SHIPPED"
              className="w-full font-mono uppercase bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Status</label>
            <Select
              value={statusFilter || 'ALL'}
              onValueChange={(val) => setStatusFilter(val === 'ALL' ? '' : (val as NotificationStatus))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value={NotificationStatus.Queued}>Queued</SelectItem>
                <SelectItem value={NotificationStatus.Processing}>Processing</SelectItem>
                <SelectItem value={NotificationStatus.Sent}>Sent</SelectItem>
                <SelectItem value={NotificationStatus.Delivered}>Delivered</SelectItem>
                <SelectItem value={NotificationStatus.Read}>Read</SelectItem>
                <SelectItem value={NotificationStatus.Failed}>Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Channel */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Channel</label>
            <Select
              value={channelFilter || 'ALL'}
              onValueChange={(val) => setChannelFilter(val === 'ALL' ? '' : (val as Channel))}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Channels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Channels</SelectItem>
                <SelectItem value={Channel.WhatsApp}>WhatsApp</SelectItem>
                <SelectItem value={Channel.Email}>Email</SelectItem>
                <SelectItem value={Channel.Sms}>SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:border-indigo-500 outline-none"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-xs text-slate-400 hover:text-slate-200 font-medium transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </Card>

      {/* Notifications Table */}
      <Card className="overflow-hidden p-0">
        {loading ? (
          <TableSkeleton rows={5} columns={8} />
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="w-8 h-8 text-indigo-400" />}
            title="No notifications recorded"
            description="No delivery records found for this product with current filter parameters."
          />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800/80">
                <thead className="bg-slate-950/70 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Timestamp</th>
                    <th className="py-3.5 px-4">Tenant</th>
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
                      onClick={() => setInspectNotification(notif)}
                      className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                        {formatDate(notif.created_at)}
                      </td>
                      <td className="py-3.5 px-4">
                        <TenantDisplay
                          tenantId={notif.tenant_id}
                          tenantName={notif.tenant_name}
                          size="sm"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                          {notif.event}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 capitalize font-medium">
                          {getChannelIcon(notif.channel)}
                          <span>{notif.channel}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
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
                            setInspectNotification(notif);
                          }}
                          className="inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Inspect</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-800/80">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => setInspectNotification(notif)}
                  className="p-4 space-y-3 hover:bg-slate-800/30 transition-colors cursor-pointer active:bg-slate-800/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-semibold border border-slate-700">
                          {notif.event}
                        </span>
                        <TenantDisplay
                          tenantId={notif.tenant_id}
                          tenantName={notif.tenant_name}
                          size="sm"
                        />
                      </div>
                      <p className="font-mono text-xs text-slate-200 mt-1 break-all">{notif.recipient}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <StatusBadge status={notif.status} type="notification" />
                    </div>
                  </div>

                  {notif.error_message && (
                    <p className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20 break-words">
                      {notif.error_message}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
                    <span>{formatDate(notif.created_at)}</span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInspectNotification(notif);
                      }}
                      className="inline-flex items-center gap-1 text-xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Inspect</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        <Pagination pagination={pagination} onPageChange={(p) => fetchNotifications(p)} />
      </Card>

      {/* Inspect Notification Modal */}
      <Modal
        isOpen={inspectNotification !== null}
        onClose={() => setInspectNotification(null)}
        title="Notification Delivery Inspection"
        maxWidth="xl"
      >
        {inspectNotification && (
          <div className="space-y-4 min-w-0">
            {/* Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-3.5 sm:p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs min-w-0">
              <div className="min-w-0">
                <span className="text-slate-500 block text-[11px]">Notification ID</span>
                <span className="font-mono text-slate-200 truncate block text-xs" title={inspectNotification.id}>
                  {inspectNotification.id}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-slate-500 block text-[11px]">Status</span>
                <div className="mt-0.5">
                  <StatusBadge status={inspectNotification.status} type="notification" />
                </div>
              </div>
              <div className="min-w-0">
                <span className="text-slate-500 block text-[11px]">Channel / Provider</span>
                <span className="text-slate-200 capitalize truncate block text-xs">
                  {inspectNotification.channel} ({inspectNotification.provider || 'meta'})
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-slate-500 block text-[11px]">Tenant</span>
                <TenantDisplay
                  tenantId={inspectNotification.tenant_id}
                  tenantName={inspectNotification.tenant_name}
                  size="sm"
                />
              </div>
              <div className="min-w-0">
                <span className="text-slate-500 block text-[11px]">Recipient</span>
                <span className="font-mono text-slate-200 break-all block text-xs">
                  {inspectNotification.recipient}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-slate-500 block text-[11px]">Event</span>
                <span className="font-mono text-slate-200 break-all block text-xs">
                  {inspectNotification.event}
                </span>
              </div>
            </div>

            {/* Error Banner if any */}
            {inspectNotification.error_message && (
              <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1 min-w-0">
                <div className="font-semibold flex items-center gap-1.5 text-rose-400 min-w-0">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">Error Code: {inspectNotification.error_code || 'DELIVERY_FAILED'}</span>
                </div>
                <p className="leading-relaxed opacity-90 break-words">{inspectNotification.error_message}</p>
              </div>
            )}

            {/* Request & Response Payloads */}
            <div className="space-y-3 min-w-0">
              <JsonViewer
                data={inspectNotification.request_metadata}
                title="Request Metadata & Variables"
                defaultOpen
              />
              <JsonViewer
                data={inspectNotification.response_metadata}
                title="Provider Response Metadata"
                defaultOpen={Boolean(inspectNotification.response_metadata)}
              />
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <Button
                variant="secondary"
                onClick={() => setInspectNotification(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

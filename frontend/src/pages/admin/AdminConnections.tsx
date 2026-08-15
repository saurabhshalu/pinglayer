import React, { useState, useEffect, useCallback } from 'react';
import {
  Link2,
  CheckCircle2,
  AlertCircle,
  Filter,
  RefreshCw,
  Phone,
  Radio,
  Mail,
  MessageSquare,
  Building,
} from 'lucide-react';
import { connectionsApi } from '../../services/connections.api';
import { productsApi } from '../../services/products.api';
import {
  Connection,
  ConnectionStatus,
  Channel,
  Product,
  ConnectionValidationResult,
  Pagination as PaginationType,
} from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { formatDate } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';

export const AdminConnections: React.FC = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
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
  const [productIdFilter, setProductIdFilter] = useState('');
  const [tenantIdFilter, setTenantIdFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState<Channel | ''>('');
  const [statusFilter, setStatusFilter] = useState<ConnectionStatus | ''>('');

  // Validate Action State
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<{
    connectionId: string;
    result: ConnectionValidationResult;
  } | null>(null);

  const { toast } = useToast();

  // Load products list for dropdown
  useEffect(() => {
    productsApi
      .listProducts({ limit: 100 })
      .then((res) => setProducts(res.data || []))
      .catch(() => {});
  }, []);

  const fetchConnections = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const res = await connectionsApi.listAllConnections({
          page,
          limit: 10,
          productId: productIdFilter || undefined,
          tenantId: tenantIdFilter || undefined,
          channel: channelFilter || undefined,
          status: statusFilter || undefined,
        });
        setConnections(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } catch (err: any) {
        toast.error('Failed to load connections', err?.error?.message || 'Error occurred');
      } finally {
        setLoading(false);
      }
    },
    [productIdFilter, tenantIdFilter, channelFilter, statusFilter, toast]
  );

  useEffect(() => {
    fetchConnections(1);
  }, [fetchConnections]);

  const handleValidate = async (conn: Connection) => {
    setValidatingId(conn.id);
    try {
      const res = await connectionsApi.validateAdminConnection(conn.id, conn.product_id);
      setValidationResult({ connectionId: conn.id, result: res.data });
      if (res.data.valid) {
        toast.success('Connection credentials valid', `Verified for ${res.data.displayName || conn.tenant_id}`);
      } else {
        toast.error('Connection validation failed', res.data.error || 'Invalid credentials');
      }
      fetchConnections(pagination.page);
    } catch (err: any) {
      toast.error('Validation request failed', err?.error?.message || 'Error communicating with provider');
    } finally {
      setValidatingId(null);
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
        return <Link2 className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  const productNameMap = products.reduce((acc, p) => {
    acc[p.id] = p.name;
    return acc;
  }, {} as Record<string, string>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Link2 className="w-5 h-5 text-indigo-400" />
            <span>All Tenant Connections</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Global oversight of all tenant connections across all SaaS products.
          </p>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => fetchConnections(pagination.page)}
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Filter className="w-3.5 h-3.5 text-indigo-400" />
          <span>Filter Connections</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Product Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Product</label>
            <select
              value={productIdFilter}
              onChange={(e) => setProductIdFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-500 outline-none cursor-pointer"
            >
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.slug})
                </option>
              ))}
            </select>
          </div>

          {/* Tenant Filter */}
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

          {/* Channel Filter */}
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

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ConnectionStatus | '')}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-500 outline-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value={ConnectionStatus.Active}>Active</option>
              <option value={ConnectionStatus.Inactive}>Inactive</option>
              <option value={ConnectionStatus.Invalid}>Invalid</option>
              <option value={ConnectionStatus.Pending}>Pending</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Connections Table */}
      <Card className="overflow-hidden p-0">
        {loading ? (
          <TableSkeleton rows={5} columns={7} />
        ) : connections.length === 0 ? (
          <EmptyState
            icon={<Link2 className="w-8 h-8 text-indigo-400" />}
            title="No connections found"
            description="No tenant connections match the current filter criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800/80">
              <thead className="bg-slate-950/70 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Product</th>
                  <th className="py-3.5 px-4">Tenant ID</th>
                  <th className="py-3.5 px-4">Channel</th>
                  <th className="py-3.5 px-4">Provider</th>
                  <th className="py-3.5 px-4">Auth Method</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {connections.map((conn) => (
                  <tr key={conn.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">
                        {productNameMap[conn.product_id] || 'Product'}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 truncate max-w-[120px]">
                        {conn.product_id}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-indigo-300">
                      {conn.tenant_id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center gap-1.5 capitalize">
                        {getChannelIcon(conn.channel)}
                        <span>{conn.channel}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 capitalize text-slate-300">
                      {conn.provider}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      {conn.auth_method}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={conn.status} type="connection" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {formatDate(conn.created_at)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={validatingId === conn.id}
                        onClick={() => handleValidate(conn)}
                        className="inline-flex items-center gap-1.5"
                      >
                        {validatingId === conn.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                        )}
                        <span>Validate</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <Pagination pagination={pagination} onPageChange={(p) => fetchConnections(p)} />
      </Card>

      {/* Validation Result Modal */}
      <Modal
        isOpen={validationResult !== null}
        onClose={() => setValidationResult(null)}
        title="Connection Validation Result"
        maxWidth="md"
      >
        {validationResult && (
          <div className="space-y-4">
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                validationResult.result.valid
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {validationResult.result.valid ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="text-sm font-semibold">
                  {validationResult.result.valid
                    ? 'Connection Validated Successfully'
                    : 'Validation Failed'}
                </h4>
                <p className="text-xs mt-0.5 opacity-90">
                  {validationResult.result.valid
                    ? 'The provider accepted credentials and verified the account status.'
                    : validationResult.result.error || 'Provider rejected credentials.'}
                </p>
              </div>
            </div>

            {validationResult.result.valid && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                {validationResult.result.displayName && (
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-slate-500" />
                      <span>Business Display Name</span>
                    </span>
                    <span className="font-semibold text-slate-100">
                      {validationResult.result.displayName}
                    </span>
                  </div>
                )}
                {validationResult.result.phoneNumber && (
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>Verified Phone Number</span>
                    </span>
                    <span className="font-mono text-emerald-400">
                      {validationResult.result.phoneNumber}
                    </span>
                  </div>
                )}
                {validationResult.result.businessAccountId && (
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">WABA Account ID</span>
                    <span className="font-mono text-indigo-300">
                      {validationResult.result.businessAccountId}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                variant="secondary"
                onClick={() => setValidationResult(null)}
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

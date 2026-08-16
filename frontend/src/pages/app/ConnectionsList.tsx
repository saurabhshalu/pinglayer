import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Link2,
  Plus,
  Radio,
  Mail,
  MessageSquare,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Phone,
  Building,
  Activity,
} from 'lucide-react';
import { connectionsApi } from '../../services/connections.api';
import {
  Connection,
  Channel,
  ConnectionTestResult,
  Pagination as PaginationType,
} from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { TenantDisplay } from '../../components/ui/TenantDisplay';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { formatDate } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';

export const ConnectionsList: React.FC = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [loading, setLoading] = useState(true);

  // Test Connection State
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    tenantId: string;
    result: ConnectionTestResult;
  } | null>(null);

  // Delete Connection State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchConnections = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const res = await connectionsApi.listConnections({
          page,
          limit: 10,
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
    [toast]
  );

  useEffect(() => {
    fetchConnections(1);
  }, [fetchConnections]);

  const handleTestConnection = async (conn: Connection) => {
    setTestingId(conn.id);
    try {
      const res = await connectionsApi.testConnection(conn.id);
      setTestResult({ tenantId: conn.tenant_id, result: res.data });
      if (res.data.connected) {
        toast.success('Connection verified', `Connected to WhatsApp as ${res.data.displayName || conn.tenant_id}`);
      } else {
        toast.error('Test connection failed', res.data.error || 'Provider rejected credentials');
      }
      fetchConnections(pagination.page);
    } catch (err: any) {
      toast.error('Test request failed', err?.error?.message || 'Error connecting with provider');
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await connectionsApi.deleteConnection(deleteId);
      toast.success('Connection removed', 'Connection and associated mappings deleted');
      setDeleteId(null);
      fetchConnections(pagination.page);
    } catch (err: any) {
      toast.error('Failed to delete connection', err?.error?.message);
    } finally {
      setDeleting(false);
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
        return <Link2 className="w-3.5 h-3.5 text-[#BDD2B6]" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#F8EDE3] flex items-center gap-2.5">
            <Link2 className="w-5 h-5 text-[#BDD2B6]" />
            <span>Tenant Connections</span>
          </h2>
          <p className="text-xs text-[#A2B29F] mt-1">
            Configure WhatsApp (Meta) and messaging channel credentials for your SaaS tenants.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchConnections(pagination.page)}
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            onClick={() => navigate('/connections/new')}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Connection</span>
          </Button>
        </div>
      </div>

      {/* Connections Table Card */}
      <Card className="overflow-hidden p-0">
        {loading ? (
          <TableSkeleton rows={5} columns={6} />
        ) : connections.length === 0 ? (
          <EmptyState
            icon={<Link2 className="w-8 h-8 text-[#BDD2B6]" />}
            title="No connections yet"
            description="Add your first tenant connection to configure WhatsApp credentials."
            action={{
              label: 'Add Connection',
              onClick: () => navigate('/connections/new'),
              icon: <Plus className="w-4 h-4" />,
            }}
          />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800/80">
                <thead className="bg-slate-950/70 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Tenant ID</th>
                    <th className="py-3.5 px-4">Channel</th>
                    <th className="py-3.5 px-4">Provider</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Auth Method</th>
                    <th className="py-3.5 px-4">Created Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {connections.map((conn) => (
                    <tr key={conn.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <TenantDisplay
                          tenantId={conn.tenant_id}
                          tenantName={(conn as any).tenant_name || (conn.config as any)?.tenant_name}
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 capitalize font-medium text-slate-200">
                          {getChannelIcon(conn.channel)}
                          <span>{conn.channel}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-300 uppercase text-[11px]">
                        {conn.provider}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={conn.status} type="connection" />
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                        {conn.auth_method}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {formatDate(conn.created_at)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={testingId === conn.id}
                            onClick={() => handleTestConnection(conn)}
                            className="inline-flex items-center gap-1 text-[#BDD2B6]"
                            title="Live Status Test"
                          >
                            {testingId === conn.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin text-[#BDD2B6]" />
                            ) : (
                              <Activity className="w-3 h-3 text-[#BDD2B6]" />
                            )}
                            <span>Test</span>
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            asChild
                            className="inline-flex items-center gap-1"
                          >
                            <Link to={`/connections/${conn.id}`}>
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </Link>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteId(conn.id)}
                            className="inline-flex items-center gap-1"
                            title="Delete Connection"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-800/80">
              {connections.map((conn) => (
                <div key={conn.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <TenantDisplay
                        tenantId={conn.tenant_id}
                        tenantName={(conn as any).tenant_name || (conn.config as any)?.tenant_name}
                      />
                      <div className="inline-flex items-center gap-1.5 capitalize text-xs text-slate-300 mt-1">
                        {getChannelIcon(conn.channel)}
                        <span>{conn.channel} ({conn.provider})</span>
                      </div>
                    </div>
                    <StatusBadge status={conn.status} type="connection" />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono text-[11px]">{conn.auth_method}</span>
                    <span>{formatDate(conn.created_at)}</span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={testingId === conn.id}
                      onClick={() => handleTestConnection(conn)}
                      className="inline-flex items-center gap-1 text-[#BDD2B6] text-xs"
                    >
                      {testingId === conn.id ? (
                        <RefreshCw className="w-3 h-3 animate-spin text-[#BDD2B6]" />
                      ) : (
                        <Activity className="w-3 h-3 text-[#BDD2B6]" />
                      )}
                      <span>Test</span>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      asChild
                      className="inline-flex items-center gap-1 text-xs"
                    >
                      <Link to={`/connections/${conn.id}`}>
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </Link>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteId(conn.id)}
                      className="inline-flex items-center gap-1 text-xs"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        <Pagination pagination={pagination} onPageChange={(p) => fetchConnections(p)} />
      </Card>

      {/* Test Connection Live Result Modal */}
      <Modal
        isOpen={testResult !== null}
        onClose={() => setTestResult(null)}
        title="Live Connection Status Check"
        maxWidth="md"
      >
        {testResult && (
          <div className="space-y-4">
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                testResult.result.connected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.result.connected ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="text-sm font-semibold">
                  {testResult.result.connected
                    ? 'WhatsApp Connection Live & Healthy'
                    : 'Connection Offline / Rejected'}
                </h4>
                <p className="text-xs mt-0.5 opacity-90">
                  {testResult.result.connected
                    ? `Successfully reached Meta Cloud API for tenant "${testResult.tenantId}".`
                    : testResult.result.error || 'Meta API rejected access token or ID.'}
                </p>
              </div>
            </div>

            {testResult.result.connected && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                {testResult.result.displayName && (
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-slate-500" />
                      <span>Business Display Name</span>
                    </span>
                    <span className="font-semibold text-slate-100">
                      {testResult.result.displayName}
                    </span>
                  </div>
                )}
                {testResult.result.phoneNumber && (
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>Phone Number</span>
                    </span>
                    <span className="font-mono text-emerald-400">
                      {testResult.result.phoneNumber}
                    </span>
                  </div>
                )}
                {testResult.result.qualityRating && (
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Quality Rating</span>
                    <span className="font-semibold capitalize text-emerald-400">
                      {testResult.result.qualityRating}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                variant="secondary"
                onClick={() => setTestResult(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Delete Connection"
        message="This will permanently delete this tenant connection and remove all associated template mappings. This action cannot be undone."
        confirmText="Delete Connection"
        cancelText="Cancel"
        danger
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};

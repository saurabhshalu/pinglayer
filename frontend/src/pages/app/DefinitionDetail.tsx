import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft,
  Layers,
  Plus,
  Edit2,
  Trash2,
  X,
  Radio,
  Loader2,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { definitionsApi } from '../../services/definitions.api';
import { connectionsApi } from '../../services/connections.api';
import {
  NotificationDefinition,
  NotificationTemplateMapping,
  Connection,
  TemplateMappingStatus,
} from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
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
import { formatDate } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';

interface VariableRow {
  position: string;
  field: string;
}

export const DefinitionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [definition, setDefinition] = useState<NotificationDefinition | null>(null);
  const [mappings, setMappings] = useState<NotificationTemplateMapping[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  // Mapping Modal State
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<NotificationTemplateMapping | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateLanguage, setTemplateLanguage] = useState('en_US');
  const [status, setStatus] = useState<TemplateMappingStatus>(TemplateMappingStatus.Active);
  const [variableRows, setVariableRows] = useState<VariableRow[]>([
    { position: '1', field: 'customerName' },
    { position: '2', field: 'orderId' },
  ]);
  const [savingMapping, setSavingMapping] = useState(false);
  const [mappingError, setMappingError] = useState<string | null>(null);

  // Delete State
  const [deleteMappingId, setDeleteMappingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [defRes, mapRes, connRes] = await Promise.all([
        definitionsApi.getDefinition(id),
        definitionsApi.listMappings(id),
        connectionsApi.listConnections({ limit: 100 }),
      ]);
      setDefinition(defRes.data);
      setMappings(mapRes.data || []);
      setConnections(connRes.data || []);
    } catch (err: any) {
      toast.error('Failed to load definition mappings', err?.error?.message);
      navigate('/definitions');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const openCreateMappingModal = () => {
    setEditingMapping(null);
    setSelectedConnectionId(connections.length > 0 ? connections[0].id : '');
    setTemplateName('');
    setTemplateLanguage('en_US');
    setStatus(TemplateMappingStatus.Active);
    setVariableRows([
      { position: '1', field: 'customerName' },
      { position: '2', field: 'orderId' },
    ]);
    setMappingError(null);
    setMappingModalOpen(true);
  };

  const openEditMappingModal = (m: NotificationTemplateMapping) => {
    setEditingMapping(m);
    setSelectedConnectionId(m.connection_id);
    setTemplateName(m.provider_template_name);
    setTemplateLanguage(m.provider_template_language || 'en_US');
    setStatus(m.status);

    const rows: VariableRow[] = Object.entries(m.variable_mapping || {}).map(
      ([pos, field]) => ({ position: pos, field: String(field) })
    );
    setVariableRows(rows.length > 0 ? rows : [{ position: '1', field: '' }]);
    setMappingError(null);
    setMappingModalOpen(true);
  };

  const handleAddVariableRow = () => {
    const nextPos = String(variableRows.length + 1);
    setVariableRows([...variableRows, { position: nextPos, field: '' }]);
  };

  const handleRemoveVariableRow = (index: number) => {
    if (variableRows.length === 1) {
      setVariableRows([{ position: '1', field: '' }]);
      return;
    }
    const updated = variableRows.filter((_, i) => i !== index);
    setVariableRows(updated);
  };

  const handleVariableChange = (index: number, key: 'position' | 'field', val: string) => {
    const updated = [...variableRows];
    updated[index][key] = val;
    setVariableRows(updated);
  };

  const handleSaveMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setMappingError(null);

    if (!selectedConnectionId) {
      setMappingError('Please select a tenant connection');
      return;
    }

    if (!templateName.trim()) {
      setMappingError('Provider template name is required');
      return;
    }

    const variableMappingObj: Record<string, string> = {};
    for (const row of variableRows) {
      if (row.position.trim() && row.field.trim()) {
        variableMappingObj[row.position.trim()] = row.field.trim();
      }
    }

    setSavingMapping(true);
    try {
      if (editingMapping) {
        await definitionsApi.updateMapping(editingMapping.id, {
          provider_template_name: templateName.trim(),
          provider_template_language: templateLanguage.trim(),
          variable_mapping: variableMappingObj,
          status,
        });
        toast.success('Template mapping updated', `Updated for "${templateName}"`);
      } else {
        await definitionsApi.createMapping({
          definition_id: id,
          connection_id: selectedConnectionId,
          provider_template_name: templateName.trim(),
          provider_template_language: templateLanguage.trim(),
          variable_mapping: variableMappingObj,
        });
        toast.success('Template mapping created', `Mapped "${templateName}" to definition`);
      }
      setMappingModalOpen(false);
      fetchDetails();
    } catch (err: any) {
      setMappingError(err?.error?.message || 'Failed to save template mapping');
    } finally {
      setSavingMapping(false);
    }
  };

  const handleDeleteMapping = async () => {
    if (!deleteMappingId) return;
    setDeleting(true);
    try {
      await definitionsApi.deleteMapping(deleteMappingId);
      toast.success('Template mapping deleted', 'Removed provider template configuration');
      setDeleteMappingId(null);
      fetchDetails();
    } catch (err: any) {
      toast.error('Failed to delete mapping', err?.error?.message);
    } finally {
      setDeleting(false);
    }
  };

  const connectionMap = connections.reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {} as Record<string, Connection>);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-slate-800 rounded animate-pulse" />
        <div className="h-36 bg-slate-900/60 rounded-2xl border border-slate-800 animate-pulse" />
        <TableSkeleton rows={3} columns={5} />
      </div>
    );
  }

  if (!definition) return null;

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        to="/definitions"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to Definitions</span>
      </Link>

      {/* Definition Info Card */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="font-mono font-bold text-xl text-[#BDD2B6]">{definition.key}</span>
              <StatusBadge status={definition.status} type="generic" />
            </div>
            <h3 className="text-sm font-semibold text-[#F8EDE3]">{definition.name}</h3>
            {definition.description && (
              <p className="text-xs text-[#A2B29F] max-w-2xl mt-1">{definition.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {definition.channels?.map((ch) => (
              <span
                key={ch}
                className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold uppercase flex items-center gap-1"
              >
                <Radio className="w-3 h-3 text-[#BDD2B6]" />
                <span>{ch}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-[#A2B29F]">
          <span>Created: {formatDate(definition.created_at)}</span>
          <span>Mapped Connections: {mappings.length}</span>
        </div>
      </Card>

      {/* Template Mappings Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-[#F8EDE3] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#BDD2B6]" />
              <span>Template Mappings by Connection</span>
            </h3>
            <p className="text-xs text-[#A2B29F] mt-0.5">
              Maps this event key to specific provider WhatsApp approved template names and parameters.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="icon"
              onClick={fetchDetails}
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              onClick={openCreateMappingModal}
              disabled={connections.length === 0}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Mapping</span>
            </Button>
          </div>
        </div>

        {/* Mappings Table */}
        <Card className="overflow-hidden p-0">
          {mappings.length === 0 ? (
            <EmptyState
              icon={<Layers className="w-8 h-8 text-[#BDD2B6]" />}
              title="No template mappings yet"
              description="Map this definition to a tenant's WhatsApp approved template name (e.g. order_shipped) to allow sending."
              action={
                connections.length > 0
                  ? {
                      label: 'Create Template Mapping',
                      onClick: openCreateMappingModal,
                      icon: <Plus className="w-4 h-4" />,
                    }
                  : undefined
              }
            />
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800/80">
                  <thead className="bg-slate-950/70 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Connection / Tenant</th>
                      <th className="py-3.5 px-4">Provider Template</th>
                      <th className="py-3.5 px-4">Language</th>
                      <th className="py-3.5 px-4">Variables Count</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {mappings.map((m) => {
                      const conn = connectionMap[m.connection_id];
                      const varCount = Object.keys(m.variable_mapping || {}).length;
                      return (
                        <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <TenantDisplay
                              tenantId={conn?.tenant_id || m.tenant_id || m.connection_id}
                              tenantName={conn?.tenant_name || m.tenant_name || (conn?.config as any)?.tenant_name}
                            />
                            <div className="text-[11px] text-slate-400 capitalize mt-0.5">
                              {conn ? `${conn.channel} (${conn.provider})` : 'Connection'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-medium text-emerald-400">
                            {m.provider_template_name}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-300">
                            {m.provider_template_language || 'en_US'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] text-slate-200">
                              <Sliders className="w-3 h-3 text-[#BDD2B6]" />
                              <span>{varCount} variable{varCount === 1 ? '' : 's'}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <StatusBadge status={m.status} type="generic" />
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => openEditMappingModal(m)}
                                className="inline-flex items-center gap-1"
                                title="Edit Mapping"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Edit</span>
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setDeleteMappingId(m.id)}
                                className="inline-flex items-center gap-1"
                                title="Delete Mapping"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-slate-800/80">
                {mappings.map((m) => {
                  const conn = connectionMap[m.connection_id];
                  const varCount = Object.keys(m.variable_mapping || {}).length;
                  return (
                    <div key={m.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3 min-w-0">
                        <div className="min-w-0 flex-1">
                          <TenantDisplay
                            tenantId={conn?.tenant_id || m.tenant_id || m.connection_id}
                            tenantName={conn?.tenant_name || m.tenant_name || (conn?.config as any)?.tenant_name}
                          />
                          <span className="font-mono text-xs font-semibold text-emerald-400 mt-1 block break-all">
                            {m.provider_template_name}
                          </span>
                        </div>
                        <div className="flex-shrink-0">
                          <StatusBadge status={m.status} type="generic" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-mono">{m.provider_template_language || 'en_US'}</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] text-slate-300">
                          <Sliders className="w-3 h-3 text-[#BDD2B6]" />
                          <span>{varCount} vars</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEditMappingModal(m)}
                          className="inline-flex items-center gap-1 text-xs"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteMappingId(m.id)}
                          className="inline-flex items-center gap-1 text-xs"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Create / Edit Mapping Modal */}
      <Modal
        isOpen={mappingModalOpen}
        onClose={() => setMappingModalOpen(false)}
        title={editingMapping ? 'Edit Template Mapping' : 'Create Template Mapping'}
        description={`Map ${definition.key} to a specific provider template.`}
        maxWidth="xl"
      >
        <form onSubmit={handleSaveMapping} className="space-y-5">
          {mappingError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{mappingError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Tenant Connection <span className="text-rose-400">*</span>
              </label>
              <Select
                disabled={Boolean(editingMapping)}
                value={selectedConnectionId}
                onValueChange={(val) => setSelectedConnectionId(val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select connection" />
                </SelectTrigger>
                <SelectContent>
                  {connections.map((c) => {
                    const friendlyName = c.tenant_name || (c.config as any)?.tenant_name;
                    return (
                      <SelectItem
                        key={c.id}
                        value={c.id}
                        label={friendlyName || c.tenant_id}
                        badge={`${c.channel} (${c.provider})`}
                        sublabel={friendlyName ? c.tenant_id : undefined}
                      />
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Provider Template Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. order_shipped, welcome_v1"
                className="w-full font-mono bg-slate-950/80 border border-slate-700 rounded-lg px-3 py-2 text-xs text-emerald-300 placeholder-slate-500 focus:border-[#798777] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Template Language <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={templateLanguage}
                onChange={(e) => setTemplateLanguage(e.target.value)}
                placeholder="en_US or en"
                className="w-full font-mono bg-slate-950/80 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-[#798777] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Mapping Status
              </label>
              <Select
                value={status}
                onValueChange={(val) => setStatus(val as TemplateMappingStatus)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TemplateMappingStatus.Active}>Active</SelectItem>
                  <SelectItem value={TemplateMappingStatus.Inactive}>Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ─── Variable Mapping Table ────────────────────────────────────────── */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-semibold text-[#F8EDE3]">
                  Variable Mapping (Key-Value)
                </label>
                <p className="text-[11px] text-[#A2B29F] mt-0.5">
                  Position matches the <code className="text-[#BDD2B6]">{"{{1}}"}</code>, <code className="text-[#BDD2B6]">{"{{2}}"}</code> placeholders in your Meta template. Data field is the key from your SaaS payload.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddVariableRow}
                className="flex items-center gap-1 border-[#798777]/40 text-[#BDD2B6]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Variable</span>
              </Button>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-2">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-[#A2B29F] px-1">
                <span className="col-span-4">Position (Parameter #)</span>
                <span className="col-span-7">Data Field (Key in payload)</span>
                <span className="col-span-1 text-center">Action</span>
              </div>

              {variableRows.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <input
                      type="text"
                      required
                      value={row.position}
                      onChange={(e) => handleVariableChange(idx, 'position', e.target.value)}
                      placeholder="e.g. 1"
                      className="w-full font-mono text-xs bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[#BDD2B6] focus:border-[#798777] outline-none"
                    />
                  </div>
                  <div className="col-span-7">
                    <input
                      type="text"
                      required
                      value={row.field}
                      onChange={(e) => handleVariableChange(idx, 'field', e.target.value)}
                      placeholder="e.g. customerName, trackingNumber"
                      className="w-full font-mono text-xs bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 focus:border-[#798777] outline-none"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveVariableRow(idx)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                      title="Remove Variable"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {mappingError && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 p-2.5 rounded-xl animate-fade-in">
              {mappingError}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setMappingModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={savingMapping}
              className="flex items-center gap-2"
            >
              {savingMapping ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>{editingMapping ? 'Save Changes' : 'Create Mapping'}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Mapping Confirmation */}
      <ConfirmDialog
        isOpen={deleteMappingId !== null}
        title="Delete Template Mapping"
        message="Are you sure you want to remove this template mapping? Notifications sent for this tenant event will fail until a new mapping is configured."
        confirmText="Delete Mapping"
        cancelText="Cancel"
        danger
        isLoading={deleting}
        onConfirm={handleDeleteMapping}
        onCancel={() => setDeleteMappingId(null)}
      />
    </div>
  );
};

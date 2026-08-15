import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileCode,
  Plus,
  Edit2,
  Trash2,
  Layers,
  Loader2,
  RefreshCw,
  ArrowUpRight,
} from 'lucide-react';
import { definitionsApi } from '../../services/definitions.api';
import {
  NotificationDefinition,
  NotificationDefinitionStatus,
  Channel,
  Pagination as PaginationType,
} from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { useToast } from '../../context/ToastContext';

export const DefinitionsList: React.FC = () => {
  const [definitions, setDefinitions] = useState<NotificationDefinition[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDef, setEditingDef] = useState<NotificationDefinition | null>(null);
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>([Channel.WhatsApp]);
  const [status, setStatus] = useState<NotificationDefinitionStatus>(NotificationDefinitionStatus.Active);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchDefinitions = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const res = await definitionsApi.listDefinitions({
          page,
          limit: 10,
        });
        setDefinitions(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } catch (err: any) {
        toast.error('Failed to load definitions', err?.error?.message);
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    fetchDefinitions(1);
  }, [fetchDefinitions]);

  const openCreateModal = () => {
    setEditingDef(null);
    setKey('');
    setName('');
    setDescription('');
    setSelectedChannels([Channel.WhatsApp]);
    setStatus(NotificationDefinitionStatus.Active);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (def: NotificationDefinition) => {
    setEditingDef(def);
    setKey(def.key);
    setName(def.name);
    setDescription(def.description || '');
    setSelectedChannels(def.channels || [Channel.WhatsApp]);
    setStatus(def.status);
    setFormError(null);
    setModalOpen(true);
  };

  const handleChannelToggle = (ch: Channel) => {
    if (selectedChannels.includes(ch)) {
      if (selectedChannels.length === 1) {
        setFormError('At least one notification channel is required');
        return;
      }
      setSelectedChannels(selectedChannels.filter((c) => c !== ch));
    } else {
      setSelectedChannels([...selectedChannels, ch]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const keyPattern = /^[A-Z_]+$/;
    if (!editingDef && !keyPattern.test(key)) {
      setFormError('Event Key must contain uppercase letters and underscores only (e.g. ORDER_SHIPPED)');
      return;
    }

    if (selectedChannels.length === 0) {
      setFormError('Please select at least one channel');
      return;
    }

    setSaving(true);
    try {
      if (editingDef) {
        await definitionsApi.updateDefinition(editingDef.id, {
          name: name.trim(),
          description: description.trim() || null,
          channels: selectedChannels,
          status,
        });
        toast.success('Definition updated', `Saved changes for ${editingDef.key}`);
      } else {
        await definitionsApi.createDefinition({
          key: key.trim().toUpperCase(),
          name: name.trim(),
          description: description.trim() || null,
          channels: selectedChannels,
        });
        toast.success('Definition created', `Event key "${key}" registered`);
      }
      setModalOpen(false);
      fetchDefinitions(pagination.page);
    } catch (err: any) {
      setFormError(err?.error?.message || 'Failed to save definition');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await definitionsApi.deleteDefinition(deleteId);
      toast.success('Definition deleted', 'The notification event key was removed');
      setDeleteId(null);
      fetchDefinitions(pagination.page);
    } catch (err: any) {
      toast.error('Failed to delete definition', err?.error?.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <FileCode className="w-5 h-5 text-indigo-400" />
            <span>Notification Definitions</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Standard event keys (e.g. <code className="font-mono text-indigo-300">ORDER_SHIPPED</code>) used by your SaaS backend to trigger notifications.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchDefinitions(pagination.page)}
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            onClick={openCreateModal}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Definition</span>
          </Button>
        </div>
      </div>

      {/* Definitions Table Card */}
      <Card className="overflow-hidden p-0">
        {loading ? (
          <TableSkeleton rows={5} columns={6} />
        ) : definitions.length === 0 ? (
          <EmptyState
            icon={<FileCode className="w-8 h-8 text-indigo-400" />}
            title="No definitions registered yet"
            description="Create your first notification definition (e.g. ORDER_SHIPPED) to map provider templates."
            action={{
              label: 'Create Definition',
              onClick: openCreateModal,
              icon: <Plus className="w-4 h-4" />,
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800/80">
              <thead className="bg-slate-950/70 text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Event Key</th>
                  <th className="py-3.5 px-4">Name & Description</th>
                  <th className="py-3.5 px-4">Channels</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Template Mappings</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {definitions.map((def) => (
                  <tr
                    key={def.id}
                    onClick={() => navigate(`/definitions/${def.id}`)}
                    className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">
                      {def.key}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-100">{def.name}</div>
                      {def.description && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                          {def.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {def.channels?.map((ch) => (
                          <span
                            key={ch}
                            className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px] uppercase font-semibold"
                          >
                            {ch}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={def.status} type="generic" />
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/definitions/${def.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Manage Mappings</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(def);
                          }}
                          className="inline-flex items-center gap-1"
                          title="Edit Definition"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(def.id);
                          }}
                          className="inline-flex items-center gap-1"
                          title="Delete Definition"
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
        )}

        {/* Pagination */}
        <Pagination pagination={pagination} onPageChange={(p) => fetchDefinitions(p)} />
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDef ? `Edit Definition: ${editingDef.key}` : 'Create Notification Definition'}
        description="Define an event key triggered by your SaaS backend."
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Event Key <span className="text-rose-400">*</span>
              </label>
              <span className="text-[11px] text-slate-500 font-mono">^[A-Z_]+$</span>
            </div>
            <input
              type="text"
              required
              disabled={Boolean(editingDef)}
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder="e.g. ORDER_SHIPPED, USER_WELCOME"
              className="w-full font-mono uppercase bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-indigo-300 placeholder-slate-500 focus:border-indigo-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Display Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Order Shipped Notification"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Sent when an order package has been shipped with tracking number."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 outline-none"
            />
          </div>

          {/* Channels Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Supported Channels <span className="text-rose-400">*</span>
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedChannels.includes(Channel.WhatsApp)}
                  onChange={() => handleChannelToggle(Channel.WhatsApp)}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-200">WhatsApp (Meta Cloud API)</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer opacity-50">
                <input
                  type="checkbox"
                  disabled
                  checked={selectedChannels.includes(Channel.Email)}
                  onChange={() => handleChannelToggle(Channel.Email)}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-400">Email (Coming soon)</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer opacity-50">
                <input
                  type="checkbox"
                  disabled
                  checked={selectedChannels.includes(Channel.Sms)}
                  onChange={() => handleChannelToggle(Channel.Sms)}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-400">SMS (Coming soon)</span>
              </label>
            </div>
          </div>

          {/* Status if editing */}
          {editingDef && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as NotificationDefinitionStatus)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 outline-none cursor-pointer"
              >
                <option value={NotificationDefinitionStatus.Active}>Active</option>
                <option value={NotificationDefinitionStatus.Inactive}>Inactive</option>
              </select>
            </div>
          )}

          {formError && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 p-2.5 rounded-xl animate-fade-in">
              {formError}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>{editingDef ? 'Save Changes' : 'Create Definition'}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Delete Notification Definition"
        message="Deleting this definition will remove all associated template mappings for all tenant connections. Do you wish to continue?"
        confirmText="Delete Definition"
        cancelText="Cancel"
        danger
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};

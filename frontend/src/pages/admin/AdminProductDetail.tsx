import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft,
  KeyRound,
  Plus,
  RotateCw,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { productsApi } from '../../services/products.api';
import { Product, ProductApiKey, ProductStatus, GeneratedApiKeyResponse } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ApiKeyDisplay } from '../../components/ui/ApiKeyDisplay';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
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

export const AdminProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [apiKeys, setApiKeys] = useState<ProductApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Key Modal State
  const [newKeyData, setNewKeyData] = useState<GeneratedApiKeyResponse | null>(null);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [confirmGenerateOpen, setConfirmGenerateOpen] = useState(false);

  // Rotate Key State
  const [rotateKeyId, setRotateKeyId] = useState<string | null>(null);
  const [rotatingKey, setRotatingKey] = useState(false);

  // Revoke Key State
  const [revokeKeyId, setRevokeKeyId] = useState<string | null>(null);
  const [revokingKey, setRevokingKey] = useState(false);

  const fetchProductAndKeys = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [prodRes, keysRes] = await Promise.all([
        productsApi.getProduct(id),
        productsApi.listApiKeys(id),
      ]);
      setProduct(prodRes.data);
      setApiKeys(keysRes.data || []);
    } catch (err: any) {
      toast.error('Failed to load product details', err?.error?.message || 'Product not found');
      navigate('/admin/products');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    fetchProductAndKeys();
  }, [fetchProductAndKeys]);

  const handleStatusChange = async (newStatus: ProductStatus) => {
    if (!id || !product) return;
    setStatusUpdating(true);
    try {
      const res = await productsApi.updateProduct(id, { status: newStatus });
      setProduct(res.data);
      toast.success('Product status updated', `Status changed to ${newStatus}`);
    } catch (err: any) {
      toast.error('Failed to update status', err?.error?.message || 'Update failed');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleGenerateKey = async () => {
    if (!id) return;
    setGeneratingKey(true);
    try {
      const res = await productsApi.generateApiKey(id);
      setNewKeyData(res.data);
      setKeyModalOpen(true);
      toast.success('API Key generated', 'Copy the key now as it will not be shown again');
      fetchProductAndKeys();
    } catch (err: any) {
      toast.error('Failed to generate key', err?.error?.message || 'Error occurred');
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleRotateKey = async () => {
    if (!id || !rotateKeyId) return;
    setRotatingKey(true);
    try {
      const res = await productsApi.rotateApiKey(id, rotateKeyId);
      setRotateKeyId(null);
      setNewKeyData(res.data);
      setKeyModalOpen(true);
      toast.success('API Key rotated', 'Old key revoked; new key generated');
      fetchProductAndKeys();
    } catch (err: any) {
      toast.error('Failed to rotate key', err?.error?.message || 'Rotation failed');
    } finally {
      setRotatingKey(false);
    }
  };

  const handleRevokeKey = async () => {
    if (!id || !revokeKeyId) return;
    setRevokingKey(true);
    try {
      await productsApi.revokeApiKey(id, revokeKeyId);
      toast.success('API Key revoked', 'The key has been deactivated immediately');
      setRevokeKeyId(null);
      fetchProductAndKeys();
    } catch (err: any) {
      toast.error('Failed to revoke key', err?.error?.message || 'Revocation failed');
    } finally {
      setRevokingKey(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-slate-800 rounded animate-pulse" />
        <div className="h-36 bg-slate-900/60 rounded-2xl border border-slate-800 animate-pulse" />
        <TableSkeleton rows={4} columns={5} />
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        to="/admin/products"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to Products List</span>
      </Link>

      {/* Product Header Card */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl font-bold tracking-tight text-[#F8EDE3]">{product.name}</h2>
              <StatusBadge status={product.status} type="product" />
            </div>
            <p className="font-mono text-xs text-[#BDD2B6]">slug: {product.slug}</p>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-2.5 w-44">
            <span className="text-xs text-[#A2B29F] font-medium whitespace-nowrap">Status:</span>
            <Select
              value={product.status}
              disabled={statusUpdating}
              onValueChange={(val) => handleStatusChange(val as ProductStatus)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ProductStatus.Active}>Active</SelectItem>
                <SelectItem value={ProductStatus.Inactive}>Inactive</SelectItem>
                <SelectItem value={ProductStatus.Suspended}>Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-[#A2B29F]">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#A2B29F]" />
            <span>ID: <span className="font-mono text-slate-300">{product.id}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#A2B29F]" />
            <span>Created: <span className="text-slate-300">{formatDate(product.created_at)}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#BDD2B6]" />
            <span>API Keys: <span className="text-[#F8EDE3] font-semibold">{apiKeys.length}</span></span>
          </div>
        </div>
      </Card>

      {/* API Keys Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-[#F8EDE3] flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#BDD2B6]" />
              <span>Product API Keys</span>
            </h3>
            <p className="text-xs text-[#A2B29F] mt-0.5">
              These keys allow SaaS backends or users to authenticate against PingLayer.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="icon"
              onClick={fetchProductAndKeys}
              title="Refresh Keys"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setConfirmGenerateOpen(true)}
              disabled={generatingKey}
              className="flex items-center gap-2"
            >
              {generatingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Generate API Key</span>
            </Button>
          </div>
        </div>

        {/* API Keys Table */}
        <Card className="overflow-hidden p-0">
          {apiKeys.length === 0 ? (
            <EmptyState
              icon={<KeyRound className="w-8 h-8 text-[#BDD2B6]" />}
              title="No API keys generated yet"
              description="Generate an API key for this product so the SaaS team can authenticate and manage notifications."
              action={{
                label: 'Generate First API Key',
                onClick: () => setConfirmGenerateOpen(true),
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
                      <th className="py-3.5 px-4">Key Prefix</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Created Date</th>
                      <th className="py-3.5 px-4">Last Used</th>
                      <th className="py-3.5 px-4">Expires</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {apiKeys.map((key) => {
                      const isRevoked = key.status === 'revoked' || Boolean((key as any).revoked_at);
                      return (
                        <tr key={key.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold text-xs">
                            {key.key_prefix}••••••••
                          </td>
                          <td className="py-3.5 px-4">
                            <StatusBadge status={key.status} type="apikey" />
                          </td>
                          <td className="py-3.5 px-4 text-slate-400">
                            {formatDate(key.created_at)}
                          </td>
                          <td className="py-3.5 px-4 text-slate-400">
                            {formatDate(key.last_used_at)}
                          </td>
                          <td className="py-3.5 px-4 text-slate-400">
                            {formatDate(key.expires_at)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={isRevoked}
                                onClick={() => setRotateKeyId(key.id)}
                                className="inline-flex items-center gap-1 text-[#BDD2B6] disabled:opacity-40 disabled:cursor-not-allowed"
                                title={isRevoked ? 'Key is already revoked' : 'Rotate Key'}
                              >
                                <RotateCw className="w-3.5 h-3.5" />
                                <span>Rotate</span>
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={isRevoked}
                                onClick={() => setRevokeKeyId(key.id)}
                                className="inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                                title={isRevoked ? 'Key is already revoked' : 'Revoke Key'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Revoke</span>
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
                {apiKeys.map((key) => {
                  const isRevoked = key.status === 'revoked' || Boolean((key as any).revoked_at);
                  return (
                    <div key={key.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-emerald-400">
                          {key.key_prefix}••••••••
                        </span>
                        <StatusBadge status={key.status} type="apikey" />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                        <div>
                          <span className="text-slate-500 block text-[11px]">Created</span>
                          <span>{formatDate(key.created_at)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[11px]">Last Used</span>
                          <span>{formatDate(key.last_used_at)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isRevoked}
                          onClick={() => setRotateKeyId(key.id)}
                          className="inline-flex items-center gap-1 text-[#BDD2B6] text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                          title={isRevoked ? 'Key is already revoked' : 'Rotate Key'}
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>Rotate</span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={isRevoked}
                          onClick={() => setRevokeKeyId(key.id)}
                          className="inline-flex items-center gap-1 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                          title={isRevoked ? 'Key is already revoked' : 'Revoke Key'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Revoke</span>
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

      {/* Generated / Rotated Key Modal */}
      <Modal
        isOpen={keyModalOpen}
        onClose={() => {
          setKeyModalOpen(false);
          setNewKeyData(null);
        }}
        title={
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#BDD2B6]" />
            <span className="text-base font-bold text-[#F8EDE3]">Product API Key Generated</span>
          </div>
        }
        description="Provide this key to your SaaS development team or use it to sign in as a product user."
        maxWidth="lg"
      >
        {newKeyData && (
          <ApiKeyDisplay
            apiKey={newKeyData.apiKey}
            prefix={newKeyData.prefix}
            onDismiss={() => {
              setKeyModalOpen(false);
              setNewKeyData(null);
            }}
          />
        )}
      </Modal>

      {/* Generate Key Confirmation */}
      <ConfirmDialog
        isOpen={confirmGenerateOpen}
        title="Generate New API Key"
        message="Are you sure you want to generate a new API key for this product? The newly generated key will be active immediately and can authenticate against PingLayer."
        confirmText="Generate Key"
        cancelText="Cancel"
        isLoading={generatingKey}
        onConfirm={() => {
          setConfirmGenerateOpen(false);
          handleGenerateKey();
        }}
        onCancel={() => setConfirmGenerateOpen(false)}
      />

      {/* Rotate Key Confirmation */}
      <ConfirmDialog
        isOpen={rotateKeyId !== null}
        title="Rotate API Key"
        message="This will immediately revoke the existing API key and generate a new replacement key. Applications using the previous key will need to be updated. Do you wish to continue?"
        confirmText="Rotate Key"
        cancelText="Keep Existing"
        danger
        isLoading={rotatingKey}
        onConfirm={handleRotateKey}
        onCancel={() => setRotateKeyId(null)}
      />

      {/* Revoke Key Confirmation */}
      <ConfirmDialog
        isOpen={revokeKeyId !== null}
        title="Revoke API Key"
        message="Are you sure you want to revoke this API key? Any SaaS service or product user authenticating with this key will stop working immediately."
        confirmText="Revoke Key"
        cancelText="Cancel"
        danger
        isLoading={revokingKey}
        onConfirm={handleRevokeKey}
        onCancel={() => setRevokeKeyId(null)}
      />
    </div>
  );
};

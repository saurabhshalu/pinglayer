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
              <h2 className="text-2xl font-bold tracking-tight text-white">{product.name}</h2>
              <StatusBadge status={product.status} type="product" />
            </div>
            <p className="font-mono text-xs text-indigo-400">slug: {product.slug}</p>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium">Status:</span>
            <select
              value={product.status}
              disabled={statusUpdating}
              onChange={(e) => handleStatusChange(e.target.value as ProductStatus)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-1.5 text-xs text-slate-200 focus:border-indigo-500 outline-none cursor-pointer disabled:opacity-50"
            >
              <option value={ProductStatus.Active}>Active</option>
              <option value={ProductStatus.Inactive}>Inactive</option>
              <option value={ProductStatus.Suspended}>Suspended</option>
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            <span>ID: <span className="font-mono text-slate-300">{product.id}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>Created: <span className="text-slate-300">{formatDate(product.created_at)}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-indigo-400" />
            <span>API Keys: <span className="text-slate-300 font-semibold">{apiKeys.length}</span></span>
          </div>
        </div>
      </Card>

      {/* API Keys Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-400" />
              <span>Product API Keys</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
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
              onClick={handleGenerateKey}
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
              icon={<KeyRound className="w-8 h-8 text-indigo-400" />}
              title="No API keys generated yet"
              description="Generate an API key for this product so the SaaS team can authenticate and manage notifications."
              action={{
                label: 'Generate First API Key',
                onClick: handleGenerateKey,
                icon: <Plus className="w-4 h-4" />,
              }}
            />
          ) : (
            <div className="overflow-x-auto">
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
                  {apiKeys.map((key) => (
                    <tr key={key.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-emerald-400 flex items-center gap-1.5">
                        <span>{key.key_prefix}••••••••</span>
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
                            onClick={() => setRotateKeyId(key.id)}
                            className="inline-flex items-center gap-1 text-indigo-300"
                            title="Rotate Key"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            <span>Rotate</span>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setRevokeKeyId(key.id)}
                            className="inline-flex items-center gap-1"
                            title="Revoke Key"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Revoke</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <span className="text-base font-bold text-slate-100">Product API Key Generated</span>
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

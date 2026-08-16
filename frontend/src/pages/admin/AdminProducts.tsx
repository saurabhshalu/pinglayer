import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Plus,
  ArrowUpRight,
  Search,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { productsApi } from '../../services/products.api';
import { Product, ProductStatus, Pagination as PaginationType } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
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

export const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [statusFilter, setStatusFilter] = useState<ProductStatus | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // New Product Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugModified, setSlugModified] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchProducts = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const res = await productsApi.listProducts({
          page,
          limit: 10,
          status: statusFilter,
        });
        setProducts(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      } catch (err: any) {
        toast.error('Failed to load products', err?.error?.message || 'Could not fetch products list');
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, toast]
  );

  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts]);

  // Handle Name Input -> Auto Slug
  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugModified) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setSlug(generatedSlug);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    const slugPattern = /^[a-z0-9-]+$/;
    if (!slugPattern.test(slug)) {
      setCreateError('Slug can only contain lowercase letters, numbers, and hyphens');
      return;
    }

    setCreating(true);
    try {
      await productsApi.createProduct({
        name: name.trim(),
        slug: slug.trim(),
      });
      toast.success('Product created', `"${name}" registered successfully`);
      setModalOpen(false);
      setName('');
      setSlug('');
      setSlugModified(false);
      fetchProducts(1);
    } catch (err: any) {
      setCreateError(err?.error?.message || 'Failed to create product');
    } finally {
      setCreating(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
  });

  const activeCount = products.filter((p) => p.status === ProductStatus.Active).length;
  const suspendedCount = products.filter((p) => p.status === ProductStatus.Suspended).length;

  return (
    <div className="space-y-6">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#F8EDE3] flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-[#BDD2B6]" />
            <span>SaaS Products</span>
          </h2>
          <p className="text-xs text-[#A2B29F] mt-1">
            Register and manage multiple tenant-enabled SaaS applications.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchProducts(pagination.page)}
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Product</span>
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="text-xs font-medium text-[#A2B29F]">Total Products</div>
          <div className="text-2xl font-bold text-[#F8EDE3] mt-1">{pagination.total || products.length}</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A2B29F]">Active Products</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#BDD2B6]" />
          </div>
          <div className="text-2xl font-bold text-[#BDD2B6] mt-1">{activeCount}</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A2B29F]">Suspended</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-1">{suspendedCount}</div>
        </Card>
      </div>

      {/* Filter / Search Bar */}
      <Card className="p-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-[#A2B29F] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by name or slug..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-[#798777] focus:ring-1 focus:ring-[#798777] outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-56">
            <span className="text-xs text-[#A2B29F] whitespace-nowrap">Status:</span>
            <Select
              value={statusFilter || 'ALL'}
              onValueChange={(val) => setStatusFilter(val === 'ALL' ? undefined : (val as ProductStatus))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value={ProductStatus.Active}>Active</SelectItem>
                <SelectItem value={ProductStatus.Inactive}>Inactive</SelectItem>
                <SelectItem value={ProductStatus.Suspended}>Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Products Table Card */}
      <Card className="overflow-hidden p-0">
        {loading ? (
          <TableSkeleton rows={5} columns={5} />
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon={<Layers className="w-8 h-8 text-[#BDD2B6]" />}
            title="No products found"
            description="No SaaS products registered yet. Create your first product to generate API keys."
            action={{
              label: 'New Product',
              onClick: () => setModalOpen(true),
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
                    <th className="py-3.5 px-4">Name</th>
                    <th className="py-3.5 px-4">Slug</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Created Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredProducts.map((product) => (
                    <motion.tr
                      key={product.id}
                      whileHover={{ backgroundColor: 'rgba(30, 41, 59, 0.4)' }}
                      onClick={() => navigate(`/admin/products/${product.id}`)}
                      className="transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-semibold text-[#F8EDE3] flex items-center gap-2">
                        <span>{product.name}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#BDD2B6] text-xs">
                        {product.slug}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={product.status} type="product" />
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {formatDate(product.created_at)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/products/${product.id}`);
                          }}
                          className="inline-flex items-center gap-1"
                        >
                          <span>View</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-[#BDD2B6]" />
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-800/80">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => navigate(`/admin/products/${product.id}`)}
                  className="p-4 space-y-3 hover:bg-slate-800/30 transition-colors cursor-pointer active:bg-slate-800/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-sm text-[#F8EDE3]">{product.name}</h4>
                      <p className="font-mono text-xs text-[#BDD2B6] mt-0.5">{product.slug}</p>
                    </div>
                    <StatusBadge status={product.status} type="product" />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span>Created: {formatDate(product.created_at)}</span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/products/${product.id}`);
                      }}
                      className="inline-flex items-center gap-1 text-[11px]"
                    >
                      <span>View Product</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#BDD2B6]" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination Controls */}
        <Pagination pagination={pagination} onPageChange={(p) => fetchProducts(p)} />
      </Card>

      {/* Create Product Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Register New SaaS Product"
        description="Add a new SaaS application to manage tenant connections and notifications."
        maxWidth="md"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Product Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Inventory SaaS, CRM Pro"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-[#798777] focus:ring-1 focus:ring-[#798777] outline-none"
              autoFocus
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Slug <span className="text-rose-400">*</span>
              </label>
              <span className="text-[11px] text-[#A2B29F] font-mono">^[a-z0-9-]+$</span>
            </div>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => {
                setSlugModified(true);
                setSlug(e.target.value);
              }}
              placeholder="e.g. inventory-saas"
              className="w-full font-mono bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-[#BDD2B6] placeholder-slate-500 focus:border-[#798777] focus:ring-1 focus:ring-[#798777] outline-none"
            />
          </div>

          {createError && (
            <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 p-2.5 rounded-lg animate-fade-in">
              {createError}
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
              disabled={creating}
              className="flex items-center gap-2"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Create Product</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

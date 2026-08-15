import { request } from './api';
import {
  Product,
  ProductStatus,
  ProductApiKey,
  GeneratedApiKeyResponse,
  PaginatedResponse,
  ApiResponse,
} from '../types';

export interface ListProductsParams {
  page?: number;
  limit?: number;
  status?: ProductStatus;
}

export interface CreateProductInput {
  name: string;
  slug: string;
}

export interface UpdateProductInput {
  name?: string;
  slug?: string;
  status?: ProductStatus;
}

export const productsApi = {
  async listProducts(params: ListProductsParams = {}): Promise<PaginatedResponse<Product>> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.status) query.set('status', params.status);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request<PaginatedResponse<Product>>(`/admin/api/products${queryString}`, {}, 'admin');
  },

  async getProduct(id: string): Promise<ApiResponse<Product>> {
    return request<ApiResponse<Product>>(`/admin/api/products/${id}`, {}, 'admin');
  },

  async createProduct(data: CreateProductInput): Promise<ApiResponse<Product>> {
    return request<ApiResponse<Product>>(
      '/admin/api/products',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      'admin'
    );
  },

  async updateProduct(id: string, data: UpdateProductInput): Promise<ApiResponse<Product>> {
    return request<ApiResponse<Product>>(
      `/admin/api/products/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
      'admin'
    );
  },

  async listApiKeys(productId: string): Promise<ApiResponse<ProductApiKey[]>> {
    return request<ApiResponse<ProductApiKey[]>>(`/admin/api/products/${productId}/api-keys`, {}, 'admin');
  },

  async generateApiKey(productId: string): Promise<ApiResponse<GeneratedApiKeyResponse>> {
    return request<ApiResponse<GeneratedApiKeyResponse>>(
      `/admin/api/products/${productId}/api-keys`,
      {
        method: 'POST',
      },
      'admin'
    );
  },

  async rotateApiKey(productId: string, keyId: string): Promise<ApiResponse<GeneratedApiKeyResponse>> {
    return request<ApiResponse<GeneratedApiKeyResponse>>(
      `/admin/api/products/${productId}/api-keys/${keyId}/rotate`,
      {
        method: 'POST',
      },
      'admin'
    );
  },

  async revokeApiKey(productId: string, keyId: string): Promise<void> {
    return request<void>(
      `/admin/api/products/${productId}/api-keys/${keyId}`,
      {
        method: 'DELETE',
      },
      'admin'
    );
  },
};

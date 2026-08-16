import { request } from './api';
import {
  Connection,
  ConnectionStatus,
  Channel,
  Provider,
  AuthMethod,
  ConnectionValidationResult,
  ConnectionTestResult,
  PaginatedResponse,
  ApiResponse,
} from '../types';

export interface CreateConnectionInput {
  tenantId: string;
  tenantName?: string | null;
  channel: Channel;
  provider: Provider;
  authMethod: AuthMethod;
  credentials: Record<string, string>;
  config?: Record<string, unknown>;
}

export interface UpdateConnectionInput {
  tenantName?: string | null;
  credentials?: Record<string, string>;
  config?: Record<string, unknown>;
  status?: ConnectionStatus;
}

export interface ListConnectionsParams {
  page?: number;
  limit?: number;
}

export interface ListAdminConnectionsParams extends ListConnectionsParams {
  productId?: string;
  tenantId?: string;
  channel?: Channel;
  status?: ConnectionStatus;
}

export const connectionsApi = {
  // ─── Product API ────────────────────────────────────────────────────────────
  async listConnections(params: ListConnectionsParams = {}): Promise<PaginatedResponse<Connection>> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<PaginatedResponse<Connection>>(`/api/v1/connections${qs}`, {}, 'product');
  },

  async getConnection(id: string): Promise<ApiResponse<Connection>> {
    return request<ApiResponse<Connection>>(`/api/v1/connections/${id}`, {}, 'product');
  },

  async createConnection(data: CreateConnectionInput): Promise<ApiResponse<Connection>> {
    return request<ApiResponse<Connection>>(
      '/api/v1/connections',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      'product'
    );
  },

  async updateConnection(id: string, data: UpdateConnectionInput): Promise<ApiResponse<Connection>> {
    return request<ApiResponse<Connection>>(
      `/api/v1/connections/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
      'product'
    );
  },

  async deleteConnection(id: string): Promise<void> {
    return request<void>(
      `/api/v1/connections/${id}`,
      {
        method: 'DELETE',
      },
      'product'
    );
  },

  async validateConnection(id: string): Promise<ApiResponse<ConnectionValidationResult>> {
    return request<ApiResponse<ConnectionValidationResult>>(
      `/api/v1/connections/${id}/validate`,
      {
        method: 'POST',
      },
      'product'
    );
  },

  async testConnection(id: string): Promise<ApiResponse<ConnectionTestResult>> {
    return request<ApiResponse<ConnectionTestResult>>(
      `/api/v1/connections/${id}/test`,
      {
        method: 'POST',
      },
      'product'
    );
  },

  // ─── Admin API ──────────────────────────────────────────────────────────────
  async listAllConnections(params: ListAdminConnectionsParams = {}): Promise<PaginatedResponse<Connection>> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.productId) query.set('productId', params.productId);
    if (params.tenantId) query.set('tenantId', params.tenantId);
    if (params.channel) query.set('channel', params.channel);
    if (params.status) query.set('status', params.status);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<PaginatedResponse<Connection>>(`/admin/api/connections${qs}`, {}, 'admin');
  },

  async validateAdminConnection(id: string, productId: string): Promise<ApiResponse<ConnectionValidationResult>> {
    return request<ApiResponse<ConnectionValidationResult>>(
      `/admin/api/connections/${id}/validate?productId=${encodeURIComponent(productId)}`,
      {
        method: 'POST',
      },
      'admin'
    );
  },
};

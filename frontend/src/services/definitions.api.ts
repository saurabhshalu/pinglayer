import { request } from './api';
import {
  NotificationDefinition,
  NotificationDefinitionStatus,
  NotificationTemplateMapping,
  TemplateMappingStatus,
  Channel,
  PaginatedResponse,
  ApiResponse,
} from '../types';

export interface CreateDefinitionInput {
  key: string;
  name: string;
  description?: string | null;
  channels: Channel[];
}

export interface UpdateDefinitionInput {
  name?: string;
  description?: string | null;
  channels?: Channel[];
  status?: NotificationDefinitionStatus;
}

export interface CreateMappingInput {
  definition_id: string;
  connection_id: string;
  provider_template_name: string;
  provider_template_language: string;
  variable_mapping: Record<string, string>;
}

export interface UpdateMappingInput {
  provider_template_name?: string;
  provider_template_language?: string;
  variable_mapping?: Record<string, string>;
  status?: TemplateMappingStatus;
}

export interface ListDefinitionsParams {
  page?: number;
  limit?: number;
}

export const definitionsApi = {
  // ─── Notification Definitions ───────────────────────────────────────────────
  async listDefinitions(params: ListDefinitionsParams = {}): Promise<PaginatedResponse<NotificationDefinition>> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<PaginatedResponse<NotificationDefinition>>(`/api/v1/definitions${qs}`, {}, 'product');
  },

  async getDefinition(id: string): Promise<ApiResponse<NotificationDefinition>> {
    return request<ApiResponse<NotificationDefinition>>(`/api/v1/definitions/${id}`, {}, 'product');
  },

  async createDefinition(data: CreateDefinitionInput): Promise<ApiResponse<NotificationDefinition>> {
    return request<ApiResponse<NotificationDefinition>>(
      '/api/v1/definitions',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      'product'
    );
  },

  async updateDefinition(id: string, data: UpdateDefinitionInput): Promise<ApiResponse<NotificationDefinition>> {
    return request<ApiResponse<NotificationDefinition>>(
      `/api/v1/definitions/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
      'product'
    );
  },

  async deleteDefinition(id: string): Promise<void> {
    return request<void>(
      `/api/v1/definitions/${id}`,
      {
        method: 'DELETE',
      },
      'product'
    );
  },

  // ─── Template Mappings ──────────────────────────────────────────────────────
  async listMappings(definitionId: string): Promise<ApiResponse<NotificationTemplateMapping[]>> {
    return request<ApiResponse<NotificationTemplateMapping[]>>(
      `/api/v1/definitions/${definitionId}/mappings`,
      {},
      'product'
    );
  },

  async getMapping(id: string): Promise<ApiResponse<NotificationTemplateMapping>> {
    return request<ApiResponse<NotificationTemplateMapping>>(`/api/v1/mappings/${id}`, {}, 'product');
  },

  async createMapping(data: CreateMappingInput): Promise<ApiResponse<NotificationTemplateMapping>> {
    return request<ApiResponse<NotificationTemplateMapping>>(
      '/api/v1/mappings',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      'product'
    );
  },

  async updateMapping(id: string, data: UpdateMappingInput): Promise<ApiResponse<NotificationTemplateMapping>> {
    return request<ApiResponse<NotificationTemplateMapping>>(
      `/api/v1/mappings/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
      'product'
    );
  },

  async deleteMapping(id: string): Promise<void> {
    return request<void>(
      `/api/v1/mappings/${id}`,
      {
        method: 'DELETE',
      },
      'product'
    );
  },
};

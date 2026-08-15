import { request } from './api';
import {
  Notification,
  NotificationDeliveryAttempt,
  NotificationStatus,
  Channel,
  PaginatedResponse,
  ApiResponse,
} from '../types';

export interface ListNotificationsParams {
  tenantId?: string;
  status?: NotificationStatus;
  event?: string;
  channel?: Channel;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface ListAdminNotificationsParams extends ListNotificationsParams {
  productId: string; // Required by backend
}

export interface SendNotificationPayload {
  tenantId: string;
  event: string;
  recipient: {
    phone: string;
  };
  data: Record<string, unknown>;
  channel?: Channel;
}

export interface SendNotificationResult {
  notificationId: string;
  status: string;
  providerMessageId?: string;
  channel: string;
  error?: {
    code: string;
    message: string;
  };
}

export const notificationsApi = {
  // ─── Product API ────────────────────────────────────────────────────────────
  async listNotifications(params: ListNotificationsParams = {}): Promise<PaginatedResponse<Notification>> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.tenantId) query.set('tenantId', params.tenantId);
    if (params.status) query.set('status', params.status);
    if (params.event) query.set('event', params.event);
    if (params.channel) query.set('channel', params.channel);
    if (params.fromDate) query.set('fromDate', params.fromDate);
    if (params.toDate) query.set('toDate', params.toDate);

    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<PaginatedResponse<Notification>>(`/api/v1/notifications${qs}`, {}, 'product');
  },

  async getNotification(id: string): Promise<ApiResponse<Notification>> {
    return request<ApiResponse<Notification>>(`/api/v1/notifications/${id}`, {}, 'product');
  },

  async getAttempts(id: string): Promise<ApiResponse<NotificationDeliveryAttempt[]>> {
    return request<ApiResponse<NotificationDeliveryAttempt[]>>(`/api/v1/notifications/${id}/attempts`, {}, 'product');
  },

  async sendNotification(payload: SendNotificationPayload): Promise<ApiResponse<SendNotificationResult>> {
    return request<ApiResponse<SendNotificationResult>>(
      '/api/v1/notifications/send',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      'product'
    );
  },

  // ─── Admin API ──────────────────────────────────────────────────────────────
  async listAllNotifications(params: ListAdminNotificationsParams): Promise<PaginatedResponse<Notification>> {
    const query = new URLSearchParams();
    query.set('productId', params.productId);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.tenantId) query.set('tenantId', params.tenantId);
    if (params.status) query.set('status', params.status);
    if (params.event) query.set('event', params.event);
    if (params.channel) query.set('channel', params.channel);
    if (params.fromDate) query.set('fromDate', params.fromDate);
    if (params.toDate) query.set('toDate', params.toDate);

    const qs = `?${query.toString()}`;
    return request<PaginatedResponse<Notification>>(`/admin/api/notifications${qs}`, {}, 'admin');
  },

  async getAdminNotification(id: string, productId: string): Promise<ApiResponse<Notification>> {
    return request<ApiResponse<Notification>>(
      `/admin/api/notifications/${id}?productId=${encodeURIComponent(productId)}`,
      {},
      'admin'
    );
  },
};

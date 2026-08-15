// ─── Enums ───────────────────────────────────────────────────────────────────

export enum ProductStatus {
  Active = 'active',
  Inactive = 'inactive',
  Suspended = 'suspended',
}

export enum ApiKeyStatus {
  Active = 'active',
  Revoked = 'revoked',
}

export enum ConnectionStatus {
  Active = 'active',
  Inactive = 'inactive',
  Invalid = 'invalid',
  Pending = 'pending',
}

export enum NotificationDefinitionStatus {
  Active = 'active',
  Inactive = 'inactive',
}

export enum TemplateMappingStatus {
  Active = 'active',
  Inactive = 'inactive',
}

export enum NotificationStatus {
  Queued = 'queued',
  Processing = 'processing',
  Sent = 'sent',
  Delivered = 'delivered',
  Read = 'read',
  Failed = 'failed',
}

export enum Channel {
  WhatsApp = 'whatsapp',
  Email = 'email',
  Sms = 'sms',
  Push = 'push',
}

export enum Provider {
  Meta = 'meta',
  Twilio = 'twilio',
  SendGrid = 'sendgrid',
  Smtp = 'smtp',
  Fcm = 'fcm',
}

export enum AuthMethod {
  Manual = 'manual',
  EmbeddedSignup = 'embedded_signup',
  OAuth = 'oauth',
}

// ─── Domain Models ────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
}

export interface ProductApiKey {
  id: string;
  product_id: string;
  key_prefix: string;
  status: ApiKeyStatus;
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
}

export interface GeneratedApiKeyResponse {
  id: string;
  productId: string;
  prefix: string;
  apiKey: string;
  status: ApiKeyStatus;
  createdAt: string;
  expiresAt?: string | null;
  note: string;
}

export interface Connection {
  id: string;
  product_id: string;
  tenant_id: string;
  channel: Channel;
  provider: Provider;
  auth_method: AuthMethod;
  status: ConnectionStatus;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ConnectionValidationResult {
  valid: boolean;
  phoneNumber?: string;
  displayName?: string;
  businessAccountId?: string;
  error?: string;
}

export interface ConnectionTestResult {
  connected: boolean;
  phoneNumber?: string;
  displayName?: string;
  qualityRating?: string;
  error?: string;
}

export interface NotificationDefinition {
  id: string;
  product_id: string;
  key: string;
  name: string;
  description: string | null;
  channels: Channel[];
  status: NotificationDefinitionStatus;
  mapping_count?: number;
  created_at: string;
  updated_at: string;
}

export interface NotificationTemplateMapping {
  id: string;
  notification_definition_id: string;
  connection_id: string;
  channel: Channel;
  provider: Provider;
  provider_template_name: string;
  provider_template_language: string;
  variable_mapping: Record<string, string>;
  status: TemplateMappingStatus;
  tenant_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  product_id: string;
  tenant_id: string;
  connection_id: string | null;
  channel: Channel;
  provider: Provider | null;
  event: string;
  recipient: string;
  provider_message_id: string | null;
  status: NotificationStatus;
  request_metadata: Record<string, unknown>;
  response_metadata: Record<string, unknown> | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationDeliveryAttempt {
  id: string;
  notification_id: string;
  attempt_number: number;
  status: NotificationStatus;
  provider_response: Record<string, unknown> | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
}

// ─── API Pagination & Responses ───────────────────────────────────────────────

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: Pagination;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  requestId?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field?: string; message: string }>;
  };
  requestId?: string;
}

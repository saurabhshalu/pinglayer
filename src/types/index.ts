// ─── Domain Enums ────────────────────────────────────────────────────────────

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
  OptedOut = 'opted_out',
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
  created_at: Date;
  updated_at: Date;
}

export interface ProductApiKey {
  id: string;
  product_id: string;
  key_hash: string;
  key_prefix: string;
  status: ApiKeyStatus;
  created_at: Date;
  expires_at: Date | null;
  last_used_at: Date | null;
}

export interface Connection {
  id: string;
  product_id: string;
  tenant_id: string;
  tenant_name?: string | null;
  channel: Channel;
  provider: Provider;
  auth_method: AuthMethod;
  status: ConnectionStatus;
  config: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationDefinition {
  id: string;
  product_id: string;
  key: string;
  name: string;
  description: string | null;
  channels: Channel[];
  status: NotificationDefinitionStatus;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationTemplateMapping {
  id: string;
  notification_definition_id: string;
  connection_id: string;
  tenant_id?: string;
  tenant_name?: string | null;
  channel: Channel;
  provider: Provider;
  provider_template_name: string;
  provider_template_language: string;
  variable_mapping: Record<string, string>;
  status: TemplateMappingStatus;
  created_at: Date;
  updated_at: Date;
}

export interface Notification {
  id: string;
  product_id: string;
  tenant_id: string;
  tenant_name?: string | null;
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
  created_at: Date;
  updated_at: Date;
}

export interface NotificationDeliveryAttempt {
  id: string;
  notification_id: string;
  attempt_number: number;
  status: NotificationStatus;
  provider_response: Record<string, unknown> | null;
  error_code: string | null;
  error_message: string | null;
  created_at: Date;
}

export interface WebhookEvent {
  id: string;
  provider: Provider;
  channel: Channel;
  raw_payload: Record<string, unknown>;
  processed: boolean;
  processed_at: Date | null;
  error: string | null;
  created_at: Date;
}

// ─── Request / Response Types ─────────────────────────────────────────────────

export interface AuthenticatedRequest extends Express.Request {
  product?: Product;
  requestId?: string;
}

// Re-export for convenience
import type Express from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ─── Provider Abstractions ────────────────────────────────────────────────────

export interface SendNotificationInput {
  recipient: string;
  templateName: string;
  templateLanguage: string;
  variables: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface SendResult {
  success: boolean;
  providerMessageId?: string;
  providerResponse?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    providerCode?: string | number;
  };
}

export interface ValidationResult {
  valid: boolean;
  phoneNumber?: string;
  displayName?: string;
  businessAccountId?: string;
  error?: string;
}

export interface ConnectionStatus_Provider {
  connected: boolean;
  phoneNumber?: string;
  displayName?: string;
  qualityRating?: string;
  error?: string;
}

export interface DecryptedCredentials {
  [key: string]: string;
}

// ─── Error Codes ──────────────────────────────────────────────────────────────

export const ErrorCodes = {
  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_API_KEY: 'INVALID_API_KEY',
  API_KEY_REVOKED: 'API_KEY_REVOKED',
  PRODUCT_INACTIVE: 'PRODUCT_INACTIVE',

  // Not Found
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
  CONNECTION_NOT_FOUND: 'CONNECTION_NOT_FOUND',
  NOTIFICATION_NOT_FOUND: 'NOTIFICATION_NOT_FOUND',
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  DEFINITION_NOT_FOUND: 'DEFINITION_NOT_FOUND',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_CHANNEL: 'INVALID_CHANNEL',
  INVALID_PROVIDER: 'INVALID_PROVIDER',
  TEMPLATE_VARIABLE_MISSING: 'TEMPLATE_VARIABLE_MISSING',
  TEMPLATE_NOT_CONFIGURED: 'TEMPLATE_NOT_CONFIGURED',
  DUPLICATE_SLUG: 'DUPLICATE_SLUG',
  DUPLICATE_KEY: 'DUPLICATE_KEY',

  // Connection
  CONNECTION_INVALID: 'CONNECTION_INVALID',
  CONNECTION_INACTIVE: 'CONNECTION_INACTIVE',

  // Provider
  PROVIDER_NOT_SUPPORTED: 'PROVIDER_NOT_SUPPORTED',
  PROVIDER_AUTH_FAILED: 'PROVIDER_AUTH_FAILED',
  PROVIDER_RATE_LIMITED: 'PROVIDER_RATE_LIMITED',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  MESSAGE_SEND_FAILED: 'MESSAGE_SEND_FAILED',

  // Opt-out
  RECIPIENT_OPTED_OUT: 'RECIPIENT_OPTED_OUT',

  // General
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  CONFLICT: 'CONFLICT',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

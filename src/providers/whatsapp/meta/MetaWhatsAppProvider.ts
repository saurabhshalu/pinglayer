import axios, { AxiosError } from 'axios';
import { BaseNotificationProvider } from '../../base/NotificationProvider';
import {
  Connection,
  SendNotificationInput,
  SendResult,
  ValidationResult,
  ConnectionStatus_Provider,
  DecryptedCredentials,
  ErrorCodes,
} from '../../../types';
import { ProviderError } from '../../../utils/errors';
import { config } from '../../../config/env';
import { logger } from '../../../utils/logger';

interface MetaTextParameter {
  type: 'text';
  text: string;
}

type MetaParameter = MetaTextParameter;

interface MetaComponent {
  type: 'header' | 'body' | 'button';
  sub_type?: 'quick_reply' | 'url';
  index?: string;
  parameters: MetaParameter[];
}

interface MetaSendResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

interface MetaPhoneNumberResponse {
  id: string;
  display_phone_number: string;
  verified_name: string;
  quality_rating?: string;
  code_verification_status?: string;
}

interface MetaErrorResponse {
  error?: {
    message?: string;
    code?: number;
    error_subcode?: number;
    type?: string;
  };
}

function getGraphUrl(path: string): string {
  return `https://graph.facebook.com/${config.meta.graphApiVersion}/${path}`;
}

function buildComponents(
  variableMapping: Record<string, string>,
  data: Record<string, string>
): MetaComponent[] {
  if (Object.keys(variableMapping).length === 0) return [];

  const parameters: MetaParameter[] = Object.entries(variableMapping)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([, dataKey]) => ({
      type: 'text' as const,
      text: data[dataKey] ?? '',
    }));

  return [{ type: 'body', parameters }];
}

export class MetaWhatsAppProvider extends BaseNotificationProvider {
  async send(
    input: SendNotificationInput,
    credentials: DecryptedCredentials,
    _connection: Connection
  ): Promise<SendResult> {
    const { access_token, phone_number_id } = credentials;

    const components = buildComponents(
      input.variables as Record<string, string>,
      input.variables as Record<string, string>
    );

    // Resolve body components from variable mapping passed through variables field
    const bodyComponents: MetaComponent[] = input.metadata?.['components'] as MetaComponent[] ?? components;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: input.recipient,
      type: 'template',
      template: {
        name: input.templateName,
        language: { code: input.templateLanguage },
        ...(bodyComponents.length > 0 ? { components: bodyComponents } : {}),
      },
    };

    try {
      const response = await axios.post<MetaSendResponse>(
        getGraphUrl(`${phone_number_id}/messages`),
        payload,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
          timeout: 15_000,
        }
      );

      const messageId = response.data.messages?.[0]?.id;
      logger.info('Meta WhatsApp message sent', {
        to: input.recipient,
        template: input.templateName,
        messageId,
      });

      return {
        success: true,
        providerMessageId: messageId,
        providerResponse: response.data as unknown as Record<string, unknown>,
      };
    } catch (err) {
      const error = err as AxiosError<MetaErrorResponse>;
      const metaError = error.response?.data?.error;
      const code = metaError?.code;
      const message = metaError?.message ?? error.message;

      logger.warn('Meta WhatsApp send failed', {
        to: input.recipient,
        template: input.templateName,
        metaErrorCode: code,
        metaErrorMessage: message,
      });

      if (code === 190) {
        return {
          success: false,
          error: {
            code: ErrorCodes.PROVIDER_AUTH_FAILED,
            message: 'WhatsApp access token is invalid or expired',
            providerCode: code,
          },
        };
      }

      if (code === 131049 || code === 4) {
        return {
          success: false,
          error: {
            code: ErrorCodes.PROVIDER_RATE_LIMITED,
            message: 'WhatsApp rate limit exceeded',
            providerCode: code,
          },
        };
      }

      return {
        success: false,
        providerResponse: error.response?.data as Record<string, unknown> | undefined,
        error: {
          code: ErrorCodes.MESSAGE_SEND_FAILED,
          message: message ?? 'Failed to send WhatsApp message',
          providerCode: code,
        },
      };
    }
  }

  async validateConnection(
    credentials: DecryptedCredentials,
    _connection: Connection
  ): Promise<ValidationResult> {
    const { access_token, phone_number_id } = credentials;

    if (!access_token || !phone_number_id) {
      return { valid: false, error: 'Missing required credentials: access_token, phone_number_id' };
    }

    try {
      const response = await axios.get<MetaPhoneNumberResponse>(
        getGraphUrl(phone_number_id),
        {
          params: { fields: 'id,display_phone_number,verified_name,quality_rating' },
          headers: { Authorization: `Bearer ${access_token}` },
          timeout: 10_000,
        }
      );

      return {
        valid: true,
        phoneNumber: response.data.display_phone_number,
        displayName: response.data.verified_name,
        businessAccountId: credentials['waba_id'],
      };
    } catch (err) {
      const error = err as AxiosError<MetaErrorResponse>;
      const metaError = error.response?.data?.error;
      const code = metaError?.code;

      if (code === 190) {
        return { valid: false, error: 'Access token is invalid or expired' };
      }

      return {
        valid: false,
        error: metaError?.message ?? 'Unable to validate WhatsApp credentials',
      };
    }
  }

  async getStatus(
    credentials: DecryptedCredentials,
    _connection: Connection
  ): Promise<ConnectionStatus_Provider> {
    const result = await this.validateConnection(credentials, _connection);

    if (!result.valid) {
      return { connected: false, error: result.error };
    }

    return {
      connected: true,
      phoneNumber: result.phoneNumber,
      displayName: result.displayName,
    };
  }
}

export const metaWhatsAppProvider = new MetaWhatsAppProvider();

import { Connection, SendNotificationInput, SendResult, ValidationResult, ConnectionStatus_Provider, DecryptedCredentials } from '../../types';

/**
 * Contract every channel/provider adapter must implement.
 * Core notification logic must not reference provider-specific APIs directly.
 */
export interface NotificationProvider {
  /**
   * Send a notification using provider-specific template message.
   */
  send(
    input: SendNotificationInput,
    credentials: DecryptedCredentials,
    connection: Connection
  ): Promise<SendResult>;

  /**
   * Validate that the provided credentials are accepted by the provider.
   * Used when a tenant sets up or updates a connection.
   */
  validateConnection(
    credentials: DecryptedCredentials,
    connection: Connection
  ): Promise<ValidationResult>;

  /**
   * Retrieve live status of a connection from the provider.
   */
  getStatus(
    credentials: DecryptedCredentials,
    connection: Connection
  ): Promise<ConnectionStatus_Provider>;
}

export abstract class BaseNotificationProvider implements NotificationProvider {
  abstract send(
    input: SendNotificationInput,
    credentials: DecryptedCredentials,
    connection: Connection
  ): Promise<SendResult>;

  abstract validateConnection(
    credentials: DecryptedCredentials,
    connection: Connection
  ): Promise<ValidationResult>;

  abstract getStatus(
    credentials: DecryptedCredentials,
    connection: Connection
  ): Promise<ConnectionStatus_Provider>;
}

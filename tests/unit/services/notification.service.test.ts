import * as notificationRepo from '../../../src/repositories/notification.repository';
import * as connectionRepo from '../../../src/repositories/connection.repository';
import * as templateService from '../../../src/services/template.service';
import * as connectionService from '../../../src/services/connection.service';
import { getProvider } from '../../../src/providers/registry';
import { sendNotification } from '../../../src/services/notification.service';
import {
  NotificationStatus,
  Channel,
  Provider,
  ConnectionStatus,
  AuthMethod,
  NotificationDefinitionStatus,
  TemplateMappingStatus,
} from '../../../src/types';

jest.mock('../../../src/repositories/notification.repository');
jest.mock('../../../src/repositories/connection.repository');
jest.mock('../../../src/services/template.service');
jest.mock('../../../src/services/connection.service');
jest.mock('../../../src/providers/registry');

const mockNotifRepo = notificationRepo as jest.Mocked<typeof notificationRepo>;
const mockConnRepo = connectionRepo as jest.Mocked<typeof connectionRepo>;
const mockTemplateService = templateService as jest.Mocked<typeof templateService>;
const mockConnectionService = connectionService as jest.Mocked<typeof connectionService>;
const mockGetProvider = getProvider as jest.Mock;

const fakeConnection = {
  id: 'conn-1',
  product_id: 'prod-1',
  tenant_id: 'tenant-1',
  channel: Channel.WhatsApp,
  provider: Provider.Meta,
  auth_method: AuthMethod.Manual,
  status: ConnectionStatus.Active,
  config: {},
  created_at: new Date(),
  updated_at: new Date(),
};

const fakeDefinition = {
  id: 'def-1',
  product_id: 'prod-1',
  key: 'ORDER_SHIPPED',
  name: 'Order Shipped',
  description: null,
  channels: [Channel.WhatsApp],
  status: NotificationDefinitionStatus.Active,
  created_at: new Date(),
  updated_at: new Date(),
};

const fakeMapping = {
  id: 'map-1',
  notification_definition_id: 'def-1',
  connection_id: 'conn-1',
  channel: Channel.WhatsApp,
  provider: Provider.Meta,
  provider_template_name: 'order_shipped',
  provider_template_language: 'en_US',
  variable_mapping: { '1': 'customerName', '2': 'orderId' },
  status: TemplateMappingStatus.Active,
  created_at: new Date(),
  updated_at: new Date(),
};

const fakeNotification = {
  id: 'notif-1',
  product_id: 'prod-1',
  tenant_id: 'tenant-1',
  connection_id: 'conn-1',
  channel: Channel.WhatsApp,
  provider: Provider.Meta,
  event: 'ORDER_SHIPPED',
  recipient: '919876543210',
  provider_message_id: null,
  status: NotificationStatus.Queued,
  request_metadata: {},
  response_metadata: null,
  error_code: null,
  error_message: null,
  created_at: new Date(),
  updated_at: new Date(),
};

describe('notification.service.sendNotification', () => {
  beforeEach(() => jest.clearAllMocks());

  it('successfully sends a notification', async () => {
    mockTemplateService.resolveMapping.mockResolvedValue({
      definition: fakeDefinition,
      mapping: fakeMapping,
      connectionId: 'conn-1',
    });
    mockConnRepo.findById.mockResolvedValue(fakeConnection);
    mockTemplateService.validateTemplateVariables.mockResolvedValue({ '1': 'Rahul', '2': 'ORD-123' });
    mockNotifRepo.createNotification.mockResolvedValue(fakeNotification);
    mockNotifRepo.updateStatus.mockResolvedValue(undefined);
    mockNotifRepo.createDeliveryAttempt.mockResolvedValue({} as any);
    mockConnectionService.getDecryptedCredentials.mockResolvedValue({
      access_token: 'token',
      phone_number_id: 'pnid',
      waba_id: 'waba',
    });
    const mockProvider = {
      send: jest.fn().mockResolvedValue({
        success: true,
        providerMessageId: 'wamid.123',
        providerResponse: {},
      }),
    };
    mockGetProvider.mockReturnValue(mockProvider);

    const result = await sendNotification({
      productId: 'prod-1',
      tenantId: 'tenant-1',
      event: 'ORDER_SHIPPED',
      recipient: '919876543210',
      data: { customerName: 'Rahul', orderId: 'ORD-123' },
    });

    expect(result.status).toBe(NotificationStatus.Sent);
    expect(result.providerMessageId).toBe('wamid.123');
    expect(result.notificationId).toBe('notif-1');
  });

  it('handles provider send failure gracefully', async () => {
    mockTemplateService.resolveMapping.mockResolvedValue({
      definition: fakeDefinition,
      mapping: fakeMapping,
      connectionId: 'conn-1',
    });
    mockConnRepo.findById.mockResolvedValue(fakeConnection);
    mockTemplateService.validateTemplateVariables.mockResolvedValue({ '1': 'Rahul', '2': 'ORD-123' });
    mockNotifRepo.createNotification.mockResolvedValue(fakeNotification);
    mockNotifRepo.updateStatus.mockResolvedValue(undefined);
    mockNotifRepo.createDeliveryAttempt.mockResolvedValue({} as any);
    mockConnectionService.getDecryptedCredentials.mockResolvedValue({ access_token: 'token', phone_number_id: 'pnid' });
    const mockProvider = {
      send: jest.fn().mockResolvedValue({
        success: false,
        error: { code: 'MESSAGE_SEND_FAILED', message: 'Provider error' },
      }),
    };
    mockGetProvider.mockReturnValue(mockProvider);

    const result = await sendNotification({
      productId: 'prod-1',
      tenantId: 'tenant-1',
      event: 'ORDER_SHIPPED',
      recipient: '919876543210',
      data: { customerName: 'Rahul', orderId: 'ORD-123' },
    });

    expect(result.status).toBe(NotificationStatus.Failed);
    expect(result.error?.code).toBe('MESSAGE_SEND_FAILED');
  });

  it('throws when template variables are missing', async () => {
    mockTemplateService.resolveMapping.mockResolvedValue({
      definition: fakeDefinition,
      mapping: fakeMapping,
      connectionId: 'conn-1',
    });
    mockConnRepo.findById.mockResolvedValue(fakeConnection);
    mockTemplateService.validateTemplateVariables.mockRejectedValue(
      Object.assign(new Error('Missing: orderId'), { code: 'TEMPLATE_VARIABLE_MISSING', statusCode: 422, isOperational: true })
    );
    mockNotifRepo.createNotification.mockResolvedValue(fakeNotification);
    mockNotifRepo.updateStatus.mockResolvedValue(undefined);
    mockConnectionService.getDecryptedCredentials.mockResolvedValue({});

    await expect(
      sendNotification({
        productId: 'prod-1',
        tenantId: 'tenant-1',
        event: 'ORDER_SHIPPED',
        recipient: '919876543210',
        data: { customerName: 'Rahul' }, // missing orderId
      })
    ).rejects.toMatchObject({ code: 'TEMPLATE_VARIABLE_MISSING' });
  });
});

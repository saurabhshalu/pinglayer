import * as templateRepo from '../../../src/repositories/template.repository';
import * as connectionRepo from '../../../src/repositories/connection.repository';
import {
  createDefinition,
  resolveMapping,
  validateTemplateVariables,
} from '../../../src/services/template.service';
import {
  Channel,
  Provider,
  AuthMethod,
  ConnectionStatus,
  NotificationDefinitionStatus,
  TemplateMappingStatus,
} from '../../../src/types';

jest.mock('../../../src/repositories/template.repository');
jest.mock('../../../src/repositories/connection.repository');

const mockTemplateRepo = templateRepo as jest.Mocked<typeof templateRepo>;
const mockConnRepo = connectionRepo as jest.Mocked<typeof connectionRepo>;

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

describe('template.service', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createDefinition', () => {
    it('creates definition when key is unique', async () => {
      mockTemplateRepo.findDefinitionByKey.mockResolvedValue(null);
      mockTemplateRepo.createDefinition.mockResolvedValue(fakeDefinition);

      const result = await createDefinition('prod-1', 'ORDER_SHIPPED', 'Order Shipped', null, [Channel.WhatsApp]);
      expect(result).toEqual(fakeDefinition);
    });

    it('throws ConflictError when key already exists', async () => {
      mockTemplateRepo.findDefinitionByKey.mockResolvedValue(fakeDefinition);
      await expect(createDefinition('prod-1', 'ORDER_SHIPPED', 'Order Shipped', null, [Channel.WhatsApp]))
        .rejects.toMatchObject({ code: 'DUPLICATE_KEY' });
    });
  });

  describe('resolveMapping', () => {
    it('resolves mapping successfully', async () => {
      mockTemplateRepo.findDefinitionByKey.mockResolvedValue(fakeDefinition);
      mockConnRepo.findActiveByProductTenantChannel.mockResolvedValue(fakeConnection);
      mockTemplateRepo.findMappingByDefinitionAndConnection.mockResolvedValue(fakeMapping);

      const result = await resolveMapping('prod-1', 'tenant-1', 'ORDER_SHIPPED', Channel.WhatsApp);
      expect(result.definition).toEqual(fakeDefinition);
      expect(result.mapping).toEqual(fakeMapping);
      expect(result.connectionId).toBe('conn-1');
    });

    it('throws DEFINITION_NOT_FOUND when event not configured', async () => {
      mockTemplateRepo.findDefinitionByKey.mockResolvedValue(null);
      await expect(resolveMapping('prod-1', 'tenant-1', 'UNKNOWN_EVENT', Channel.WhatsApp))
        .rejects.toMatchObject({ code: 'DEFINITION_NOT_FOUND' });
    });

    it('throws CONNECTION_NOT_FOUND when no active connection', async () => {
      mockTemplateRepo.findDefinitionByKey.mockResolvedValue(fakeDefinition);
      mockConnRepo.findActiveByProductTenantChannel.mockResolvedValue(null);
      await expect(resolveMapping('prod-1', 'tenant-1', 'ORDER_SHIPPED', Channel.WhatsApp))
        .rejects.toMatchObject({ code: 'CONNECTION_NOT_FOUND' });
    });

    it('throws TEMPLATE_NOT_CONFIGURED when no mapping exists', async () => {
      mockTemplateRepo.findDefinitionByKey.mockResolvedValue(fakeDefinition);
      mockConnRepo.findActiveByProductTenantChannel.mockResolvedValue(fakeConnection);
      mockTemplateRepo.findMappingByDefinitionAndConnection.mockResolvedValue(null);
      await expect(resolveMapping('prod-1', 'tenant-1', 'ORDER_SHIPPED', Channel.WhatsApp))
        .rejects.toMatchObject({ code: 'TEMPLATE_NOT_CONFIGURED' });
    });
  });

  describe('validateTemplateVariables', () => {
    it('resolves all variables successfully', async () => {
      const result = await validateTemplateVariables(fakeMapping, {
        customerName: 'Rahul',
        orderId: 'ORD-123',
      });
      expect(result).toEqual({ '1': 'Rahul', '2': 'ORD-123' });
    });

    it('throws TEMPLATE_VARIABLE_MISSING when data key missing', async () => {
      await expect(validateTemplateVariables(fakeMapping, { customerName: 'Rahul' }))
        .rejects.toMatchObject({ code: 'TEMPLATE_VARIABLE_MISSING' });
    });

    it('converts non-string values to strings', async () => {
      const result = await validateTemplateVariables(fakeMapping, {
        customerName: 'Rahul',
        orderId: 123,
      });
      expect(result['2']).toBe('123');
    });
  });
});

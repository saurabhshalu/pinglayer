import axios from 'axios';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const MockAdapter = require('axios-mock-adapter');
import { MetaWhatsAppProvider } from '../../../src/providers/whatsapp/meta/MetaWhatsAppProvider';
import { Channel, Provider, AuthMethod, ConnectionStatus } from '../../../src/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mock = new MockAdapter(axios as any);
const provider = new MetaWhatsAppProvider();

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

const credentials = {
  waba_id: 'waba-123',
  phone_number_id: 'pnid-456',
  access_token: 'EAAG...token',
};

describe('MetaWhatsAppProvider', () => {
  afterEach(() => mock.reset());

  describe('validateConnection', () => {
    it('returns valid=true for valid credentials', async () => {
      mock.onGet(/graph\.facebook\.com/).reply(200, {
        id: 'pnid-456',
        display_phone_number: '+91 98765 43210',
        verified_name: 'Test Business',
        quality_rating: 'GREEN',
      });

      const result = await provider.validateConnection(credentials, fakeConnection);
      expect(result.valid).toBe(true);
      expect(result.phoneNumber).toBe('+91 98765 43210');
      expect(result.displayName).toBe('Test Business');
    });

    it('returns valid=false for expired token (code 190)', async () => {
      mock.onGet(/graph\.facebook\.com/).reply(401, {
        error: { code: 190, message: 'Invalid OAuth access token' },
      });

      const result = await provider.validateConnection(credentials, fakeConnection);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/token.*invalid|invalid.*token|expired/i);
    });

    it('returns valid=false when credentials missing', async () => {
      const result = await provider.validateConnection({}, fakeConnection);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/missing/i);
    });
  });

  describe('send', () => {
    it('returns success with providerMessageId', async () => {
      mock.onPost(/graph\.facebook\.com/).reply(200, {
        messaging_product: 'whatsapp',
        contacts: [{ input: '919876543210', wa_id: '919876543210' }],
        messages: [{ id: 'wamid.abc123' }],
      });

      const result = await provider.send(
        {
          recipient: '919876543210',
          templateName: 'order_shipped',
          templateLanguage: 'en_US',
          variables: { '1': 'Rahul', '2': 'ORD-123' },
        },
        credentials,
        fakeConnection
      );

      expect(result.success).toBe(true);
      expect(result.providerMessageId).toBe('wamid.abc123');
    });

    it('returns PROVIDER_AUTH_FAILED for code 190', async () => {
      mock.onPost(/graph\.facebook\.com/).reply(401, {
        error: { code: 190, message: 'Invalid OAuth access token' },
      });

      const result = await provider.send(
        {
          recipient: '919876543210',
          templateName: 'order_shipped',
          templateLanguage: 'en_US',
          variables: {},
        },
        credentials,
        fakeConnection
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PROVIDER_AUTH_FAILED');
    });

    it('returns PROVIDER_RATE_LIMITED for code 4', async () => {
      mock.onPost(/graph\.facebook\.com/).reply(429, {
        error: { code: 4, message: 'Application request limit reached' },
      });

      const result = await provider.send(
        { recipient: '919876543210', templateName: 't', templateLanguage: 'en', variables: {} },
        credentials,
        fakeConnection
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('PROVIDER_RATE_LIMITED');
    });

    it('does not include access_token in returned data', async () => {
      mock.onPost(/graph\.facebook\.com/).reply(200, {
        messaging_product: 'whatsapp',
        contacts: [],
        messages: [{ id: 'wamid.xyz' }],
      });

      const result = await provider.send(
        { recipient: '919876543210', templateName: 't', templateLanguage: 'en', variables: {} },
        credentials,
        fakeConnection
      );

      const resultStr = JSON.stringify(result);
      expect(resultStr).not.toContain('EAAG');
      expect(resultStr).not.toContain('access_token');
    });
  });
});

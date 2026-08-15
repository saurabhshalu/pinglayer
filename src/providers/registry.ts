import { Channel, Provider } from '../types';
import { NotificationProvider } from './base/NotificationProvider';
import { metaWhatsAppProvider } from './whatsapp/meta/MetaWhatsAppProvider';
import { AppError } from '../utils/errors';
import { ErrorCodes } from '../types';

type ProviderKey = `${Channel}:${Provider}`;

const providerRegistry = new Map<ProviderKey, NotificationProvider>();

providerRegistry.set(`${Channel.WhatsApp}:${Provider.Meta}`, metaWhatsAppProvider);

// Future registrations:
// providerRegistry.set(`${Channel.Email}:${Provider.SendGrid}`, sendGridProvider);
// providerRegistry.set(`${Channel.Email}:${Provider.Smtp}`, smtpProvider);
// providerRegistry.set(`${Channel.Sms}:${Provider.Twilio}`, twilioProvider);

export function getProvider(channel: Channel, provider: Provider): NotificationProvider {
  const key: ProviderKey = `${channel}:${provider}`;
  const impl = providerRegistry.get(key);

  if (!impl) {
    throw new AppError(
      ErrorCodes.PROVIDER_NOT_SUPPORTED,
      `No provider implementation for channel=${channel}, provider=${provider}`,
      400
    );
  }

  return impl;
}

export function listSupportedProviders(): Array<{ channel: Channel; provider: Provider }> {
  return Array.from(providerRegistry.keys()).map(key => {
    const [channel, provider] = key.split(':') as [Channel, Provider];
    return { channel, provider };
  });
}

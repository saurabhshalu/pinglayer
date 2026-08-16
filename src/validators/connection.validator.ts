import Joi from 'joi';
import { Channel, Provider, AuthMethod } from '../types';

export const createConnectionSchema = Joi.object({
  tenantId: Joi.string().trim().min(1).max(255).required(),
  tenantName: Joi.string().trim().max(255).allow(null, '').optional(),
  channel: Joi.string().valid(...Object.values(Channel)).required(),
  provider: Joi.string().valid(...Object.values(Provider)).required(),
  authMethod: Joi.string().valid(...Object.values(AuthMethod)).default(AuthMethod.Manual),
  credentials: Joi.object().pattern(Joi.string(), Joi.string()).required(),
  config: Joi.object().optional().default({}),
});

export const updateConnectionSchema = Joi.object({
  tenantName: Joi.string().trim().max(255).allow(null, '').optional(),
  credentials: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  config: Joi.object().optional(),
  status: Joi.string().valid('active', 'inactive').optional(),
}).min(1);

export const whatsAppCredentialsSchema = Joi.object({
  tenantId: Joi.string().trim().min(1).max(255).required(),
  tenantName: Joi.string().trim().max(255).allow(null, '').optional(),
  channel: Joi.string().valid(Channel.WhatsApp).required(),
  provider: Joi.string().valid(Provider.Meta).required(),
  authMethod: Joi.string().valid(AuthMethod.Manual, AuthMethod.EmbeddedSignup).default(AuthMethod.Manual),
  credentials: Joi.object({
    waba_id: Joi.string().required(),
    phone_number_id: Joi.string().required(),
    access_token: Joi.string().required(),
  }).required(),
  config: Joi.object().optional().default({}),
});

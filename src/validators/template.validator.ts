import Joi from 'joi';
import { Channel } from '../types';

export const createDefinitionSchema = Joi.object({
  key: Joi.string().trim().uppercase().pattern(/^[A-Z_]+$/).min(1).max(100).required(),
  name: Joi.string().trim().min(1).max(255).required(),
  description: Joi.string().allow(null, '').optional(),
  channels: Joi.array().items(Joi.string().valid(...Object.values(Channel))).min(1).required(),
});

export const updateDefinitionSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional(),
  description: Joi.string().allow(null, '').optional(),
  channels: Joi.array().items(Joi.string().valid(...Object.values(Channel))).min(1).optional(),
  status: Joi.string().valid('active', 'inactive').optional(),
}).min(1);

export const createMappingSchema = Joi.object({
  definition_id: Joi.string().uuid().required(),
  connection_id: Joi.string().uuid().required(),
  provider_template_name: Joi.string().trim().min(1).max(255).required(),
  provider_template_language: Joi.string().min(2).max(20).default('en'),
  variable_mapping: Joi.object().pattern(Joi.string(), Joi.string()).required(),
});

export const updateMappingSchema = Joi.object({
  provider_template_name: Joi.string().trim().min(1).max(255).optional(),
  provider_template_language: Joi.string().min(2).max(20).optional(),
  variable_mapping: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  status: Joi.string().valid('active', 'inactive').optional(),
}).min(1);

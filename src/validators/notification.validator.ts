import Joi from 'joi';
import { Channel } from '../types';

export const sendNotificationSchema = Joi.object({
  tenantId: Joi.string().trim().min(1).max(255).required(),
  event: Joi.string().trim().uppercase().min(1).max(100).required(),
  recipient: Joi.object({
    phone: Joi.string().pattern(/^\d{7,15}$/).required(),
  }).required(),
  data: Joi.object().required(),
  channel: Joi.string().valid(...Object.values(Channel)).optional(),
});

export const listNotificationsSchema = Joi.object({
  tenantId: Joi.string().optional(),
  status: Joi.string().valid('queued', 'processing', 'sent', 'delivered', 'read', 'failed').optional(),
  event: Joi.string().optional(),
  channel: Joi.string().valid(...Object.values(Channel)).optional(),
  fromDate: Joi.date().iso().optional(),
  toDate: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

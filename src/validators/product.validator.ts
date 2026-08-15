import Joi from 'joi';
import { ValidationError } from '../utils/errors';

export const createProductSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).min(2).max(100).required(),
});

export const updateProductSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional(),
  slug: Joi.string().trim().lowercase().pattern(/^[a-z0-9-]+$/).min(2).max(100).optional(),
  status: Joi.string().valid('active', 'inactive', 'suspended').optional(),
}).min(1);

export function validate<T>(schema: Joi.Schema, data: unknown): T {
  const { error, value } = schema.validate(data, { abortEarly: false, stripUnknown: true });
  if (error) {
    const details = error.details.map(d => ({ field: d.path.join('.'), message: d.message }));
    throw new ValidationError(error.details.map(d => d.message).join('; '), details);
  }
  return value as T;
}

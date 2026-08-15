import { Request, Response, NextFunction } from 'express';
import * as templateService from '../../services/template.service';
import {
  createDefinitionSchema,
  updateDefinitionSchema,
  createMappingSchema,
  updateMappingSchema,
} from '../../validators/template.validator';
import { validate } from '../../validators/product.validator';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '../../utils/response';
import { parsePagination } from '../../utils/pagination';
import { AuthenticatedRequest } from '../../middleware/auth';
import { Channel, NotificationDefinition, NotificationTemplateMapping } from '../../types';

// ─── Definitions ──────────────────────────────────────────────────────────────

export async function createDefinition(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = (req as AuthenticatedRequest).product;
    const body = validate<{ key: string; name: string; description?: string | null; channels: Channel[] }>(
      createDefinitionSchema,
      req.body
    );
    const def = await templateService.createDefinition(
      product.id,
      body.key,
      body.name,
      body.description ?? null,
      body.channels
    );
    sendCreated(res, def);
  } catch (err) {
    next(err);
  }
}

export async function listDefinitions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = (req as AuthenticatedRequest).product;
    const params = parsePagination(req);
    const result = await templateService.listDefinitions(product.id, params);
    sendPaginated(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getDefinition(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = (req as AuthenticatedRequest).product;
    const def = await templateService.getDefinition(req.params['id']!, product.id);
    sendSuccess(res, def);
  } catch (err) {
    next(err);
  }
}

export async function updateDefinition(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = (req as AuthenticatedRequest).product;
    const body = validate<Partial<NotificationDefinition>>(updateDefinitionSchema, req.body);
    const def = await templateService.updateDefinition(req.params['id']!, product.id, body);
    sendSuccess(res, def);
  } catch (err) {
    next(err);
  }
}

export async function deleteDefinition(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = (req as AuthenticatedRequest).product;
    await templateService.deleteDefinition(req.params['id']!, product.id);
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
}

// ─── Template Mappings ────────────────────────────────────────────────────────

export async function createMapping(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = (req as AuthenticatedRequest).product;
    const body = validate<{
      definition_id: string;
      connection_id: string;
      provider_template_name: string;
      provider_template_language: string;
      variable_mapping: Record<string, string>;
    }>(createMappingSchema, req.body);

    const mapping = await templateService.createMapping(
      product.id,
      body.definition_id,
      body.connection_id,
      body.provider_template_name,
      body.provider_template_language,
      body.variable_mapping
    );
    sendCreated(res, mapping);
  } catch (err) {
    next(err);
  }
}

export async function listMappings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = (req as AuthenticatedRequest).product;
    const mappings = await templateService.listMappingsByDefinition(req.params['definitionId']!, product.id);
    sendSuccess(res, mappings);
  } catch (err) {
    next(err);
  }
}

export async function getMapping(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = (req as AuthenticatedRequest).product;
    const mapping = await templateService.getMapping(req.params['id']!, product.id);
    sendSuccess(res, mapping);
  } catch (err) {
    next(err);
  }
}

export async function updateMapping(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = (req as AuthenticatedRequest).product;
    const body = validate<Partial<Pick<NotificationTemplateMapping, 'provider_template_name' | 'provider_template_language' | 'variable_mapping' | 'status'>>>(
      updateMappingSchema,
      req.body
    );
    const mapping = await templateService.updateMapping(req.params['id']!, product.id, body);
    sendSuccess(res, mapping);
  } catch (err) {
    next(err);
  }
}

export async function deleteMapping(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = (req as AuthenticatedRequest).product;
    await templateService.deleteMapping(req.params['id']!, product.id);
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
}

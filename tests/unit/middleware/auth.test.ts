import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../../src/middleware/auth';
import * as productService from '../../../src/services/product.service';
import { ProductStatus } from '../../../src/types';

jest.mock('../../../src/services/product.service');
const mockAuth = productService.authenticateProductApiKey as jest.Mock;

function mockReq(authHeader?: string): Request {
  return { headers: { authorization: authHeader } } as unknown as Request;
}

const fakeProduct = {
  id: 'prod-1',
  name: 'Test',
  slug: 'test',
  status: ProductStatus.Active,
  created_at: new Date(),
  updated_at: new Date(),
};

describe('authenticate middleware', () => {
  const res = {} as Response;

  it('sets req.product and calls next for valid key', async () => {
    mockAuth.mockResolvedValue(fakeProduct);
    const req = mockReq('Bearer valid-key');
    const next = jest.fn() as unknown as NextFunction;

    await authenticate(req, res, next);
    expect((req as any).product).toEqual(fakeProduct);
    expect(next).toHaveBeenCalledWith(); // no error
  });

  it('calls next with UnauthorizedError when no auth header', () => {
    const req = mockReq();
    const next = jest.fn() as unknown as NextFunction;
    authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('calls next with error when key is invalid', async () => {
    mockAuth.mockRejectedValue(Object.assign(new Error('Bad key'), { statusCode: 401, code: 'INVALID_API_KEY', isOperational: true }));
    const req = mockReq('Bearer bad-key');
    const next = jest.fn() as unknown as NextFunction;

    await authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_API_KEY' }));
  });
});

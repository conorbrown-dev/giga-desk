import type { NextFunction, Request, Response } from 'express';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { describe, expect, it, vi } from 'vitest';
import { configureFrontendAssets } from './configure-application.js';

describe('configureFrontendAssets', () => {
  it('serves the SPA fallback without intercepting API routes', () => {
    const useStaticAssets = vi.fn();
    let fallback: ((request: Request, response: Response, next: NextFunction) => void) | undefined;
    const app = {
      useStaticAssets,
      use: vi.fn((handler: (request: Request, response: Response, next: NextFunction) => void) => {
        fallback = handler;
      }),
    } as unknown as NestExpressApplication;

    configureFrontendAssets(app, '/srv/web');

    expect(useStaticAssets).toHaveBeenCalledWith('/srv/web');
    const next = vi.fn();
    const sendFile = vi.fn((_file, _options, callback: (error: Error | null) => void) => {
      callback(null);
    });
    fallback?.({ path: '/projects' } as Request, { sendFile } as unknown as Response, next);
    expect(sendFile).toHaveBeenCalledWith('index.html', { root: '/srv/web' }, expect.any(Function));

    fallback?.({ path: '/api/health' } as Request, { sendFile } as unknown as Response, next);
    expect(next).toHaveBeenCalledOnce();
  });
});

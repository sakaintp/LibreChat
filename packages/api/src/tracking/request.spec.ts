import type { ServerProductFact } from 'librechat-data-provider';
import type { Response } from 'express';
import type { ServerRequest } from '~/types';
import {
  trackRequestProductFact,
  bindProductSubmissionContext,
  createProductTrackingMiddleware,
} from './request';

const productTracking = { enabled: true };

const fact: ServerProductFact = {
  name: 'librechat.langfuse.connection.changed',
  enabled: true,
  configured: true,
};

it('passes the fact to the request-owned tracker once', () => {
  const productTracker = jest.fn();
  trackRequestProductFact({ productTracker, productTracking }, fact);
  expect(productTracker.mock.calls).toEqual([[fact]]);
});

it('does nothing without a host tracker', () => {
  expect(() => trackRequestProductFact({ productTracking }, fact)).not.toThrow();
});

it('isolates sync and async tracker failures', async () => {
  expect(() =>
    trackRequestProductFact(
      {
        productTracking,
        productTracker: () => {
          throw new Error('offline');
        },
      },
      fact,
    ),
  ).not.toThrow();
  trackRequestProductFact(
    { productTracking, productTracker: () => Promise.reject(new Error('offline')) },
    fact,
  );
  await new Promise<void>((resolve) => setImmediate(resolve));
});

it.each([undefined, { enabled: false }])(
  'does not invoke an injected callback when policy is %p',
  (policy) => {
    const productTracker = jest.fn();
    trackRequestProductFact({ productTracker, productTracking: policy }, fact);
    expect(productTracker).not.toHaveBeenCalled();
  },
);

it.each([undefined, false, true])(
  'uses the deployment startup policy %p on every request',
  (enabled) => {
    const middleware = createProductTrackingMiddleware(
      enabled === undefined ? undefined : { productTracking: { enabled } },
    );
    const productTracker = jest.fn();
    const req: Partial<ServerRequest> = { productTracker };
    const next = jest.fn();
    middleware(req as ServerRequest, {} as Response, next);
    trackRequestProductFact(req, fact);
    expect(req.productTracking).toMatchObject({ enabled: enabled === true });
    expect(next).toHaveBeenCalledTimes(1);
    expect(productTracker).toHaveBeenCalledTimes(enabled === true ? 1 : 0);
  },
);

it('copies valid correlation IDs but never identity from headers', () => {
  const productTrackingContext = {
    sessionId: 'd79706cc-4ddf-4cf7-b99a-333755af9be8',
    submissionId: '1b7ff690-8b9b-4af6-b68d-9cab4a5f2f21',
  };
  const req: Partial<ServerRequest> = {
    headers: {
      'x-librechat-product-session-id': productTrackingContext.sessionId,
      'x-librechat-product-submission-id': productTrackingContext.submissionId,
      'x-librechat-product-user-id': 'untrusted',
    },
    productTracker: jest.fn(),
  };
  createProductTrackingMiddleware({ productTracking: { enabled: true } })(
    req as ServerRequest,
    {} as Response,
    jest.fn(),
  );
  expect(req.productTrackingContext).toEqual(productTrackingContext);
  expect(req.user).toBeUndefined();
  trackRequestProductFact(req, fact);
  expect(req.productTracker).toHaveBeenCalledWith(fact, productTrackingContext);
});

it.each([false, true])('ignores malformed correlation headers with enabled=%s', (enabled) => {
  const req: Partial<ServerRequest> = {
    headers: { 'x-librechat-product-session-id': ['not', 'one'] },
  };
  createProductTrackingMiddleware({ productTracking: { enabled } })(
    req as ServerRequest,
    {} as Response,
    jest.fn(),
  );
  expect(req.productTrackingContext).toBeUndefined();
});

it('joins drained queued turns by UUID without inventing a session', () => {
  const submissionId = '1b7ff690-8b9b-4af6-b68d-9cab4a5f2f21';
  const req: Partial<ServerRequest> = { productTracking };
  bindProductSubmissionContext(req, submissionId);
  expect(req.productTrackingContext).toEqual({ submissionId });
});

it.each([undefined, 'steer-leftover:existing'])('ignores non-UUID queued id %p', (id) => {
  const req: Partial<ServerRequest> = { productTracking };
  bindProductSubmissionContext(req, id);
  expect(req.productTrackingContext).toBeUndefined();
});

it('keeps the original session and explicit submission header', () => {
  const sessionId = 'd79706cc-4ddf-4cf7-b99a-333755af9be8';
  const submissionId = '1b7ff690-8b9b-4af6-b68d-9cab4a5f2f21';
  const req: Partial<ServerRequest> = {
    productTracking,
    productTrackingContext: { sessionId },
  };
  bindProductSubmissionContext(req, submissionId);
  expect(req.productTrackingContext).toEqual({ sessionId, submissionId });
  bindProductSubmissionContext(req, '2b7ff690-8b9b-4af6-b68d-9cab4a5f2f21');
  expect(req.productTrackingContext).toEqual({ sessionId, submissionId });
});

it('ignores queued correlation when tracking is disabled', () => {
  const req: Partial<ServerRequest> = { productTracking: { enabled: false } };
  bindProductSubmissionContext(req, '1b7ff690-8b9b-4af6-b68d-9cab4a5f2f21');
  expect(req.productTrackingContext).toBeUndefined();
});

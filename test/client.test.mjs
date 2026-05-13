import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GirderCoreApiError,
  GirderCoreClient,
  GirderCoreInvalidJsonError,
  GirderCoreNetworkError,
  GirderCoreTimeoutError,
} from '../dist/esm/index.js';

const SANDBOX_BASE_URL = 'https://api.stg.pay.girdercore.com';
const PRODUCTION_BASE_URL = 'https://api.pay.girdercore.com';

const initPayload = {
  providerCode: 'MOBILE_MONEY',
  order: {
    clientUid: 'client-123',
    integrationKey: 'integration-123',
    amount: 100,
    currency: 'USD',
    reason: 'Invoice payment',
  },
  customer: {
    names: 'Jane Doe',
    email: 'jane@example.com',
    msisdn: '+243810000001',
    language: 'en',
  },
};

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    statusText: 'OK',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

async function withMockFetch(handler, fn) {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return handler(url, init);
  };

  try {
    await fn(calls);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test('constructor requires an API key', () => {
  assert.throws(
    () =>
      new GirderCoreClient({
        apiKey: '',
        environment: 'sandbox',
      }),
    /apiKey is required/
  );
});

test('constructor rejects unsupported environments at runtime', () => {
  assert.throws(
    () =>
      new GirderCoreClient({
        apiKey: 'test_key',
        environment: 'local',
      }),
    /Unsupported GirderCore environment/
  );
});

test('initPayment posts to the sandbox URL with bearer authentication', async () => {
  await withMockFetch(
    async () => jsonResponse({ transactionUid: 'txn_123', status: 'PENDING' }),
    async (calls) => {
      const client = new GirderCoreClient({
        apiKey: 'test_key',
        environment: 'sandbox',
      });

      const result = await client.initPayment(initPayload);

      assert.deepEqual(result, { transactionUid: 'txn_123', status: 'PENDING' });
      assert.equal(calls.length, 1);
      assert.equal(
        calls[0].url,
        `${SANDBOX_BASE_URL}/orchestration/payments/init`
      );
      assert.equal(calls[0].init.method, 'POST');
      assert.deepEqual(calls[0].init.headers, {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test_key',
      });
      assert.deepEqual(JSON.parse(calls[0].init.body), initPayload);
    }
  );
});

test('production environment resolves to the production API URL', async () => {
  await withMockFetch(
    async () => jsonResponse({ transactionUid: 'txn_123', status: 'SUCCESS' }),
    async (calls) => {
      const client = new GirderCoreClient({
        apiKey: 'live_key',
        environment: 'production',
      });

      await client.findPaymentByRef('txn_123');

      assert.equal(
        calls[0].url,
        `${PRODUCTION_BASE_URL}/orchestration/payments/txn_123`
      );
      assert.deepEqual(calls[0].init.headers, {
        'Content-Type': 'application/json',
        Authorization: 'Bearer live_key',
      });
    }
  );
});

test('findPaymentByRef encodes the transaction id in the path', async () => {
  await withMockFetch(
    async () => jsonResponse({ transactionUid: 'txn/with space', status: 'SUCCESS' }),
    async (calls) => {
      const client = new GirderCoreClient({
        apiKey: 'test_key',
        environment: 'sandbox',
      });

      await client.findPaymentByRef('txn/with space');

      assert.equal(
        calls[0].url,
        `${SANDBOX_BASE_URL}/orchestration/payments/txn%2Fwith%20space`
      );
      assert.equal(calls[0].init.method, 'GET');
      assert.equal(calls[0].init.body, undefined);
    }
  );
});

test('submitPaymentMethod sends the payment method payload and accepts empty responses', async () => {
  await withMockFetch(
    async () => new Response(null, { status: 204, statusText: 'No Content' }),
    async (calls) => {
      const client = new GirderCoreClient({
        apiKey: 'test_key',
        environment: 'sandbox',
      });

      const result = await client.submitPaymentMethod('txn_123', {
        name: 'MOBILEMONEY',
        msisdn: '243810000001',
        provider: 'MPESA',
      });

      assert.equal(result, undefined);
      assert.equal(
        calls[0].url,
        `${SANDBOX_BASE_URL}/orchestration/payments/txn_123/log`
      );
      assert.equal(calls[0].init.method, 'PUT');
      assert.deepEqual(JSON.parse(calls[0].init.body), {
        name: 'MOBILEMONEY',
        msisdn: '243810000001',
        provider: 'MPESA',
      });
    }
  );
});

test('getPaymentStatus uses the current status endpoint with generic naming', async () => {
  const statusBody = {
    request: {
      order: {
        currency: 'USD',
        amount: 100,
        customerFullName: 'Jane Doe',
        customerEmailAddress: 'jane@example.com',
      },
      paymentChannel: {
        channel: 'MOBILEMONEY',
        provider: 'MPESA',
        walletId: '243810000001',
      },
    },
    clientUid: 'client-123',
    status: 'PENDING',
  };

  await withMockFetch(
    async () => jsonResponse(statusBody),
    async (calls) => {
      const client = new GirderCoreClient({
        apiKey: 'test_key',
        environment: 'sandbox',
      });

      const result = await client.getPaymentStatus('txn_123');

      assert.deepEqual(result, statusBody);
      assert.equal(
        calls[0].url,
        `${SANDBOX_BASE_URL}/proxypay-txns/payments/txn_123`
      );
      assert.equal(calls[0].init.method, 'GET');
    }
  );
});

test('deprecated getProxyPayPaymentStatus remains compatible', async () => {
  await withMockFetch(
    async () =>
      jsonResponse({
        request: {
          order: {
            currency: 'USD',
            amount: 100,
            customerFullName: 'Jane Doe',
            customerEmailAddress: 'jane@example.com',
          },
          paymentChannel: {
            channel: 'MOBILEMONEY',
            provider: 'MPESA',
            walletId: '243810000001',
          },
        },
        clientUid: 'client-123',
      }),
    async (calls) => {
      const client = new GirderCoreClient({
        apiKey: 'test_key',
        environment: 'sandbox',
      });

      await client.getProxyPayPaymentStatus('txn_123');

      assert.equal(calls.length, 1);
      assert.equal(
        calls[0].url,
        `${SANDBOX_BASE_URL}/proxypay-txns/payments/txn_123`
      );
    }
  );
});

test('non-2xx responses throw GirderCoreApiError with parsed response body', async () => {
  await withMockFetch(
    async () =>
      jsonResponse(
        { code: 'INVALID_PAYMENT', message: 'Payment is invalid' },
        { status: 400, statusText: 'Bad Request' }
      ),
    async () => {
      const client = new GirderCoreClient({
        apiKey: 'test_key',
        environment: 'sandbox',
      });

      await assert.rejects(
        () => client.initPayment(initPayload),
        (error) => {
          assert.equal(error instanceof GirderCoreApiError, true);
          assert.equal(error.status, 400);
          assert.equal(
            error.url,
            `${SANDBOX_BASE_URL}/orchestration/payments/init`
          );
          assert.deepEqual(error.responseBody, {
            code: 'INVALID_PAYMENT',
            message: 'Payment is invalid',
          });
          return true;
        }
      );
    }
  );
});

test('invalid JSON success responses throw GirderCoreInvalidJsonError', async () => {
  await withMockFetch(
    async () =>
      new Response('not-json', {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' },
      }),
    async () => {
      const client = new GirderCoreClient({
        apiKey: 'test_key',
        environment: 'sandbox',
      });

      await assert.rejects(
        () => client.findPaymentByRef('txn_123'),
        GirderCoreInvalidJsonError
      );
    }
  );
});

test('network failures throw GirderCoreNetworkError', async () => {
  await withMockFetch(
    async () => {
      throw new TypeError('network unavailable');
    },
    async () => {
      const client = new GirderCoreClient({
        apiKey: 'test_key',
        environment: 'sandbox',
      });

      await assert.rejects(
        () => client.findPaymentByRef('txn_123'),
        GirderCoreNetworkError
      );
    }
  );
});

test('default request timeout throws GirderCoreTimeoutError', async () => {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;

  globalThis.setTimeout = (callback) => {
    queueMicrotask(callback);
    return 1;
  };
  globalThis.clearTimeout = () => undefined;

  try {
    await withMockFetch(
      async (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          });
        }),
      async () => {
        const client = new GirderCoreClient({
          apiKey: 'test_key',
          environment: 'sandbox',
        });

        await assert.rejects(
          () => client.findPaymentByRef('txn_123'),
          GirderCoreTimeoutError
        );
      }
    );
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

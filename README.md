# @girdercore/sdk

Official TypeScript SDK for the [GirderCore](https://girderpay.com) payment orchestration API.

The SDK exposes generic payment orchestration concepts so application code is not coupled to a single payment aggregator.

## Requirements

- Node.js **>= 18** or a runtime with the standard `fetch` API

## Installation

```bash
npm install @girdercore/sdk
```

## Client Setup

```ts
import { GirderCoreClient } from '@girdercore/sdk';

const client = new GirderCoreClient({
  apiKey: process.env.GIRDER_API_KEY!,
  environment: 'sandbox',
});
```

The SDK resolves the API base URL internally from `environment`, so application code does not need to manage GirderCore URLs.

Supported environments:

- `sandbox`: GirderCore sandbox/staging API
- `production`: GirderCore production API

## Usage

### 1. Init Payment

```ts
const { transactionUid } = await client.initPayment({
  providerCode: 'MOBILE_MONEY',
  order: {
    clientUid: '7455c0ce-a29c-4594-b182-052e0a8a28b1',
    integrationKey: '29629429-7f40-49ff-a646-5a6a99645d70',
    amount: 199.99,
    currency: 'USD',
    reason: 'Monthly subscription renewal',
  },
  customer: {
    names: 'John Doe',
    email: 'john.doe@example.com',
    msisdn: '+14155552671',
    language: 'en',
  },
});
```

### 2. Submit Payment Method

```ts
await client.submitPaymentMethod(transactionUid, {
  name: 'MOBILEMONEY',
  msisdn: '243810000001',
  provider: 'MPESA',
});
```

### 3. Find Payment

```ts
const payment = await client.findPaymentByRef(transactionUid);

console.log(payment.status);
```

### 4. Get Payment Status

```ts
const status = await client.getPaymentStatus(transactionUid);

console.log(status.request.order.amount);
console.log(status.error);
```

## Compatibility Notes

Current GirderCore status responses still include fields from the existing provider-backed API shape, such as `request.order`, `request.paymentChannel`, and `clientUid`. The SDK treats these fields as the initial generic payment status shape so application code can move away from aggregator-specific naming now.

The previous `getProxyPayPaymentStatus` method and `ProxyPay*` types are still exported as deprecated aliases. New integrations should use:

- `getPaymentStatus`
- `PaymentStatusResponse`
- `PaymentChannel`
- `PaymentRequestSnapshot`

SDK-side encryption and webhook helpers are intentionally not included in this iteration.

## Error Handling

All SDK errors extend `GirderCoreError`.

```ts
import {
  GirderCoreApiError,
  GirderCoreInvalidJsonError,
  GirderCoreNetworkError,
  GirderCoreTimeoutError,
} from '@girdercore/sdk';

try {
  await client.initPayment({ ... });
} catch (err) {
  if (err instanceof GirderCoreApiError) {
    console.error(err.status);
    console.error(err.responseBody);
    console.error(err.url);
  }

  if (err instanceof GirderCoreTimeoutError) {
    console.error(err.timeoutMs);
  }

  if (err instanceof GirderCoreNetworkError) {
    console.error(err.url);
  }

  if (err instanceof GirderCoreInvalidJsonError) {
    console.error(err.rawBody);
  }
}
```

## Development

```bash
npm run build
npm run test:types
npm test
```

## License

MIT

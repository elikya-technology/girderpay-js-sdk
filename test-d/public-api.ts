import {
  GirderCoreApiError,
  GirderCoreClient,
  GirderCoreError,
  GirderCoreInvalidJsonError,
  GirderCoreNetworkError,
  GirderCoreTimeoutError,
} from '../src/index.js';
import type {
  ClientConfig,
  GirderCoreEnvironment,
  PaymentChannel,
  PaymentOrderSnapshot,
  PaymentRequestSnapshot,
  PaymentStatus,
  PaymentStatusResponse,
  ProxyPayOrder,
  ProxyPayPaymentChannel,
  ProxyPayPaymentStatusResponse,
  ProxyPayRequest,
} from '../src/index.js';

const environment: GirderCoreEnvironment = 'sandbox';

const config: ClientConfig = {
  apiKey: 'test_key',
  environment,
};

const client = new GirderCoreClient(config);

const status: PaymentStatus = 'PENDING';
const order: PaymentOrderSnapshot = {
  currency: 'USD',
  amount: 100,
  customerFullName: 'Jane Doe',
  customerEmailAddress: 'jane@example.com',
};
const paymentChannel: PaymentChannel = {
  channel: 'MOBILEMONEY',
  provider: 'MPESA',
  walletId: '243810000001',
};
const requestSnapshot: PaymentRequestSnapshot = {
  order,
  paymentChannel,
};
const paymentStatusResponse: PaymentStatusResponse = {
  request: requestSnapshot,
  clientUid: 'client-123',
  status,
};

const deprecatedOrder: ProxyPayOrder = order;
const deprecatedChannel: ProxyPayPaymentChannel = paymentChannel;
const deprecatedRequest: ProxyPayRequest = requestSnapshot;
const deprecatedStatus: ProxyPayPaymentStatusResponse = paymentStatusResponse;

void client.getPaymentStatus('txn_123');
void client.getProxyPayPaymentStatus('txn_123');
void deprecatedOrder;
void deprecatedChannel;
void deprecatedRequest;
void deprecatedStatus;
void GirderCoreError;
void GirderCoreApiError;
void GirderCoreInvalidJsonError;
void GirderCoreNetworkError;
void GirderCoreTimeoutError;

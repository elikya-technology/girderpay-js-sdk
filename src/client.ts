import {
  GirderCoreApiError,
  GirderCoreInvalidJsonError,
  GirderCoreNetworkError,
  GirderCoreTimeoutError,
} from './errors.js';
import type {
  ClientConfig,
  GirderCoreEnvironment,
  InitPaymentRequest,
  InitPaymentResponse,
  FindPaymentResponse,
  SubmitPaymentMethodRequest,
  PaymentStatusResponse,
} from './types.js';

const ENVIRONMENT_BASE_URLS: Record<GirderCoreEnvironment, string> = {
  sandbox: 'https://api.stg.pay.girdercore.com',
  production: 'https://api.pay.girdercore.com',
};

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Official TypeScript client for the GirderCore payment orchestration API.
 */
export class GirderCoreClient {
  private readonly baseURL: string;
  private readonly apiKey: string;
  private readonly timeout: number;

  constructor(config: ClientConfig) {
    if (!config.apiKey || typeof config.apiKey !== 'string') {
      throw new Error('apiKey is required');
    }

    const baseURL = ENVIRONMENT_BASE_URLS[config.environment];
    if (!baseURL) {
      throw new Error('Unsupported GirderCore environment');
    }

    this.baseURL = baseURL;
    this.apiKey = config.apiKey;
    this.timeout = DEFAULT_TIMEOUT_MS;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseURL}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const init: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      signal: controller.signal,
    };

    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, init);
      clearTimeout(timeoutId);

      if (!response.ok) {
        let responseBody: unknown;
        try {
          responseBody = await response.json();
        } catch {
          responseBody = await response.text();
        }
        throw new GirderCoreApiError(
          `GirderCore API error: ${response.status} ${response.statusText}`,
          response.status,
          responseBody,
          url
        );
      }

      const text = await response.text();
      if (!text) {
        return undefined as T;
      }

      try {
        return JSON.parse(text) as T;
      } catch {
        throw new GirderCoreInvalidJsonError(
          'Response body contains invalid JSON',
          url
        );
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof GirderCoreApiError || error instanceof GirderCoreInvalidJsonError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new GirderCoreTimeoutError('Request timed out', url);
      }

      if (error instanceof TypeError) {
        throw new GirderCoreNetworkError(error.message, url);
      }

      throw error;
    }
  }

  /**
   * Initialise a new payment transaction.
   *
   * @param payload - Payment initialisation payload.
   * @returns The created transaction reference and status.
   */
  async initPayment(
    payload: InitPaymentRequest
  ): Promise<InitPaymentResponse> {
    return this.request<InitPaymentResponse>(
      'POST',
      '/orchestration/payments/init',
      payload
    );
  }

  /**
   * Find an existing payment by its transaction UID.
   *
   * @param transactionUid - The transaction UID returned by {@link initPayment}.
   * @returns Payment details.
   */
  async findPaymentByRef(
    transactionUid: string
  ): Promise<FindPaymentResponse> {
    return this.request<FindPaymentResponse>(
      'GET',
      `/orchestration/payments/${encodeURIComponent(transactionUid)}`
    );
  }

  /**
   * Submit or update the payment method for an existing transaction.
   *
   * @param transactionUid - The transaction UID.
   * @param payload - Payment method details.
   */
  async submitPaymentMethod(
    transactionUid: string,
    payload: SubmitPaymentMethodRequest
  ): Promise<void> {
    return this.request<void>(
      'PUT',
      `/orchestration/payments/${encodeURIComponent(transactionUid)}/log`,
      payload
    );
  }

  /**
   * Retrieve the current status for a payment.
   *
   * @param transactionUid - The transaction UID.
   * @returns Payment status including the original request snapshot.
   */
  async getPaymentStatus(
    transactionUid: string
  ): Promise<PaymentStatusResponse> {
    return this.request<PaymentStatusResponse>(
      'GET',
      `/proxypay-txns/payments/${encodeURIComponent(transactionUid)}`
    );
  }

  /**
   * Retrieve the ProxyPay-specific status for a payment.
   *
   * @deprecated Use {@link getPaymentStatus} instead.
   * @param transactionUid - The transaction UID.
   * @returns Payment status including the original request snapshot.
   */
  async getProxyPayPaymentStatus(
    transactionUid: string
  ): Promise<PaymentStatusResponse> {
    return this.getPaymentStatus(transactionUid);
  }
}

/**
 * Base error class for all GirderCore SDK errors.
 */
export class GirderCoreError extends Error {
  readonly name: string = 'GirderCoreError';

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, GirderCoreError.prototype);
  }
}

/**
 * Thrown when the GirderCore API returns a non-2xx response.
 */
export class GirderCoreApiError extends GirderCoreError {
  readonly name = 'GirderCoreApiError';

  constructor(
    message: string,
    /** HTTP status code returned by the API. */
    public readonly status: number,
    /** Raw response body (parsed JSON or plain text). */
    public readonly responseBody: unknown,
    /** URL that was requested. */
    public readonly url: string
  ) {
    super(message);
    Object.setPrototypeOf(this, GirderCoreApiError.prototype);
  }
}

/**
 * Thrown when a success response contains invalid JSON.
 */
export class GirderCoreInvalidJsonError extends GirderCoreError {
  readonly name = 'GirderCoreInvalidJsonError';

  constructor(
    message: string,
    /** URL that was requested. */
    public readonly url: string
  ) {
    super(message);
    Object.setPrototypeOf(this, GirderCoreInvalidJsonError.prototype);
  }
}

/**
 * Thrown when a network failure occurs.
 */
export class GirderCoreNetworkError extends GirderCoreError {
  readonly name = 'GirderCoreNetworkError';

  constructor(
    message: string,
    /** URL that was requested. */
    public readonly url: string
  ) {
    super(message);
    Object.setPrototypeOf(this, GirderCoreNetworkError.prototype);
  }
}

/**
 * Thrown when a request exceeds the configured timeout.
 */
export class GirderCoreTimeoutError extends GirderCoreError {
  readonly name = 'GirderCoreTimeoutError';

  constructor(
    message: string,
    /** URL that was requested. */
    public readonly url: string
  ) {
    super(message);
    Object.setPrototypeOf(this, GirderCoreTimeoutError.prototype);
  }
}

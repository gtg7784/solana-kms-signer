/**
 * Custom error class for AWS KMS API-related errors.
 *
 * Thrown when AWS KMS operations fail, including:
 * - GetPublicKey failures (AccessDeniedException, KeyNotFoundException, etc.)
 * - Sign failures (ThrottlingException, KeyUnavailableException, etc.)
 * - Network timeouts and service unavailability
 *
 * @example
 * ```typescript
 * throw new KmsClientError('Failed to get public key from KMS', originalError);
 * ```
 */
export class KmsClientError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'KmsClientError';
  }
}

/**
 * Custom error class for DER-encoded public key extraction errors.
 *
 * Thrown when extracting ED25519 public key from DER format fails, including:
 * - Invalid DER structure (missing SEQUENCE tag)
 * - Missing BIT STRING in DER encoding
 * - Unexpected BIT STRING length (not 33 bytes)
 * - Malformed SubjectPublicKeyInfo structure
 *
 * @example
 * ```typescript
 * throw new PublicKeyExtractionError('Invalid DER encoding: missing SEQUENCE tag');
 * ```
 */
export class PublicKeyExtractionError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'PublicKeyExtractionError';
  }
}

/**
 * Custom error class for ED25519 signature verification errors.
 *
 * Thrown when signature validation fails, including:
 * - Signature verification returns false (invalid signature)
 * - Incorrect signature length (not 64 bytes)
 * - Signature does not match public key and message
 * - Cryptographic verification failure
 *
 * @example
 * ```typescript
 * throw new SignatureVerificationError('Signature verification failed', { signature, publicKey });
 * ```
 */
export class SignatureVerificationError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'SignatureVerificationError';
  }
}

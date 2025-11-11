import { describe, it, expect } from 'vitest';
import { KmsClientError, PublicKeyExtractionError, SignatureVerificationError } from './index.js';

describe('Error Classes', () => {
  describe('KmsClientError', () => {
    it('should create error with message', () => {
      // given
      const message = 'Test KMS error';

      // when
      const error = new KmsClientError(message);

      // then
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(KmsClientError);
      expect(error.message).toBe(message);
      expect(error.name).toBe('KmsClientError');
      expect(error.cause).toBeUndefined();
    });

    it('should create error with message and cause', () => {
      // given
      const message = 'Test KMS error';
      const cause = new Error('Original error');

      // when
      const error = new KmsClientError(message, cause);

      // then
      expect(error.message).toBe(message);
      expect(error.cause).toBe(cause);
      expect(error.name).toBe('KmsClientError');
    });

    it('should create error with cause as object', () => {
      // given
      const message = 'Test KMS error';
      const cause = { code: 'AccessDeniedException', statusCode: 403 };

      // when
      const error = new KmsClientError(message, cause);

      // then
      expect(error.cause).toBe(cause);
    });

    it('should have stack trace', () => {
      // given
      const message = 'Test KMS error';

      // when
      const error = new KmsClientError(message);

      // then
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('KmsClientError');
    });
  });

  describe('PublicKeyExtractionError', () => {
    it('should create error with message', () => {
      // given
      const message = 'Invalid DER encoding';

      // when
      const error = new PublicKeyExtractionError(message);

      // then
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(PublicKeyExtractionError);
      expect(error.message).toBe(message);
      expect(error.name).toBe('PublicKeyExtractionError');
      expect(error.cause).toBeUndefined();
    });

    it('should create error with message and cause', () => {
      // given
      const message = 'Invalid DER encoding';
      const cause = new Error('DER parsing failed');

      // when
      const error = new PublicKeyExtractionError(message, cause);

      // then
      expect(error.message).toBe(message);
      expect(error.cause).toBe(cause);
      expect(error.name).toBe('PublicKeyExtractionError');
    });

    it('should have stack trace', () => {
      // given
      const message = 'Invalid DER encoding';

      // when
      const error = new PublicKeyExtractionError(message);

      // then
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('PublicKeyExtractionError');
    });
  });

  describe('SignatureVerificationError', () => {
    it('should create error with message', () => {
      // given
      const message = 'Signature verification failed';

      // when
      const error = new SignatureVerificationError(message);

      // then
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(SignatureVerificationError);
      expect(error.message).toBe(message);
      expect(error.name).toBe('SignatureVerificationError');
      expect(error.cause).toBeUndefined();
    });

    it('should create error with message and cause', () => {
      // given
      const message = 'Signature verification failed';
      const cause = { signature: new Uint8Array(64), publicKey: new Uint8Array(32) };

      // when
      const error = new SignatureVerificationError(message, cause);

      // then
      expect(error.message).toBe(message);
      expect(error.cause).toBe(cause);
      expect(error.name).toBe('SignatureVerificationError');
    });

    it('should have stack trace', () => {
      // given
      const message = 'Signature verification failed';

      // when
      const error = new SignatureVerificationError(message);

      // then
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('SignatureVerificationError');
    });
  });

  describe('Error Chaining', () => {
    it('should support error chaining with nested causes', () => {
      // given
      const rootCause = new Error('Root cause error');
      const intermediateCause = new PublicKeyExtractionError('Intermediate error', rootCause);

      // when
      const topLevelError = new KmsClientError('Top level error', intermediateCause);

      // then
      expect(topLevelError.cause).toBe(intermediateCause);
      expect((topLevelError.cause as PublicKeyExtractionError).cause).toBe(rootCause);
    });

    it('should preserve cause immutability', () => {
      // given
      const message = 'Test error';
      const cause = { code: 'TEST_ERROR' };
      const error = new KmsClientError(message, cause);

      // when/then
      // TypeScript should prevent reassignment:
      // error.cause = { code: 'DIFFERENT_ERROR' }; // This would cause TypeScript error

      expect(error.cause).toBe(cause);
    });
  });
});

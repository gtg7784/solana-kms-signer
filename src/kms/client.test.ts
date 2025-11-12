import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KmsClientError } from '../errors/index.js';
import type { KmsConfig } from '../types/index.js';
import { KmsClient } from './client.js';

/**
 * Mock DER-encoded ED25519 public key matching AWS KMS GetPublicKey format.
 * Reuses the same structure as publicKey.test.ts for consistency.
 */
const MOCK_DER_PUBLIC_KEY = new Uint8Array([
	0x30,
	0x2a, // SEQUENCE, 42 bytes
	0x30,
	0x05, // AlgorithmIdentifier SEQUENCE, 5 bytes
	0x06,
	0x03,
	0x2b,
	0x65,
	0x70, // OID: 1.3.101.112 (Ed25519)
	0x03,
	0x21,
	0x00, // BIT STRING, 33 bytes (32 + 1 padding)
	// Mock 32-byte ED25519 public key
	0x01,
	0x02,
	0x03,
	0x04,
	0x05,
	0x06,
	0x07,
	0x08,
	0x09,
	0x0a,
	0x0b,
	0x0c,
	0x0d,
	0x0e,
	0x0f,
	0x10,
	0x11,
	0x12,
	0x13,
	0x14,
	0x15,
	0x16,
	0x17,
	0x18,
	0x19,
	0x1a,
	0x1b,
	0x1c,
	0x1d,
	0x1e,
	0x1f,
	0x20,
]);

/**
 * Mock ED25519 signature (64 bytes)
 * ED25519 signatures are always exactly 64 bytes
 */
const MOCK_SIGNATURE = new Uint8Array(64).fill(0xab);

/**
 * Mock KMS configuration for testing
 */
const MOCK_KMS_CONFIG: KmsConfig = {
	region: 'us-east-1',
	keyId:
		'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012',
};

// Mock AWS SDK client and commands
const mockSend = vi.fn();

vi.mock('@aws-sdk/client-kms', () => {
	return {
		KMSClient: class {
			send = mockSend;
		},
		GetPublicKeyCommand: class {
			constructor(public params: unknown) {}
		},
		SignCommand: class {
			constructor(public params: unknown) {}
		},
	};
});

describe('KmsClient', () => {
	beforeEach(() => {
		// Reset mock state before each test
		mockSend.mockReset();
	});

	describe('Happy Path', () => {
		it('should successfully retrieve public key as DER-encoded Uint8Array', async () => {
			// given: KmsClient instance and mocked successful KMS response
			const client = new KmsClient(MOCK_KMS_CONFIG);
			mockSend.mockResolvedValueOnce({
				PublicKey: MOCK_DER_PUBLIC_KEY,
			});

			// when: Getting public key from KMS
			const publicKey = await client.getPublicKey();

			// then: Should return DER-encoded public key as Uint8Array
			expect(publicKey).toBeInstanceOf(Uint8Array);
			expect(publicKey.length).toBe(MOCK_DER_PUBLIC_KEY.length);
			expect(publicKey).toEqual(MOCK_DER_PUBLIC_KEY);

			// then: Should have called KMS with correct parameters
			expect(mockSend).toHaveBeenCalledTimes(1);
		});

		it('should successfully sign message and return 64-byte signature', async () => {
			// given: KmsClient instance and message to sign
			const client = new KmsClient(MOCK_KMS_CONFIG);
			const message = new Uint8Array([1, 2, 3, 4, 5]);

			mockSend.mockResolvedValueOnce({
				Signature: MOCK_SIGNATURE,
			});

			// when: Signing message with KMS
			const signature = await client.sign(message);

			// then: Should return 64-byte signature
			expect(signature).toBeInstanceOf(Uint8Array);
			expect(signature.length).toBe(64);
			expect(signature).toEqual(MOCK_SIGNATURE);

			// then: Should have called KMS with correct SigningAlgorithm
			expect(mockSend).toHaveBeenCalledTimes(1);
			const signCommand = mockSend.mock.calls[0][0];
			expect(signCommand.params.SigningAlgorithm).toBe('ED25519_SHA_512');
			expect(signCommand.params.MessageType).toBe('RAW');
			expect(signCommand.params.Message).toEqual(message);
		});
	});

	describe('Failure Paths', () => {
		it('should throw KmsClientError when getPublicKey receives AccessDeniedException', async () => {
			// given: KmsClient and mocked AccessDeniedException
			const client = new KmsClient(MOCK_KMS_CONFIG);
			const awsError = new Error(
				'User: arn:aws:iam::123456789012:user/test is not authorized',
			);
			awsError.name = 'AccessDeniedException';
			mockSend.mockRejectedValueOnce(awsError);

			// when: Getting public key with insufficient permissions
			const getPublicKeyPromise = client.getPublicKey();

			// then: Should throw KmsClientError with cause
			await expect(getPublicKeyPromise).rejects.toThrow(KmsClientError);
			await expect(getPublicKeyPromise).rejects.toThrow(
				'Failed to get public key from KMS',
			);

			// then: Verify cause is preserved in error
			mockSend.mockRejectedValueOnce(awsError);
			try {
				await client.getPublicKey();
			} catch (error) {
				expect(error).toBeInstanceOf(KmsClientError);
				expect((error as KmsClientError).cause).toBe(awsError);
			}
		});

		it('should throw KmsClientError when getPublicKey receives KeyNotFoundException', async () => {
			// given: KmsClient and mocked KeyNotFoundException
			const client = new KmsClient(MOCK_KMS_CONFIG);
			const awsError = new Error(
				'Key arn:aws:kms:us-east-1:123456789012:key/nonexistent is not found',
			);
			awsError.name = 'KeyNotFoundException';
			mockSend.mockRejectedValueOnce(awsError);

			// when: Getting public key for non-existent key
			const getPublicKeyPromise = client.getPublicKey();

			// then: Should throw KmsClientError with cause
			await expect(getPublicKeyPromise).rejects.toThrow(KmsClientError);
			await expect(getPublicKeyPromise).rejects.toThrow(
				'Failed to get public key from KMS',
			);
		});

		it('should throw KmsClientError when getPublicKey receives InvalidKeyUsageException', async () => {
			// given: KmsClient and mocked InvalidKeyUsageException
			const client = new KmsClient(MOCK_KMS_CONFIG);
			const awsError = new Error(
				'The request is not valid for the specified key usage',
			);
			awsError.name = 'InvalidKeyUsageException';
			mockSend.mockRejectedValueOnce(awsError);

			// when: Getting public key for key with wrong usage (e.g., ENCRYPT_DECRYPT)
			const getPublicKeyPromise = client.getPublicKey();

			// then: Should throw KmsClientError with cause
			await expect(getPublicKeyPromise).rejects.toThrow(KmsClientError);
			await expect(getPublicKeyPromise).rejects.toThrow(
				'Failed to get public key from KMS',
			);
		});

		it('should throw KmsClientError when sign receives ThrottlingException', async () => {
			// given: KmsClient and mocked ThrottlingException
			const client = new KmsClient(MOCK_KMS_CONFIG);
			const message = new Uint8Array([1, 2, 3]);
			const awsError = new Error('Rate exceeded');
			awsError.name = 'ThrottlingException';
			mockSend.mockRejectedValueOnce(awsError);

			// when: Signing message with rate limit exceeded
			const signPromise = client.sign(message);

			// then: Should throw KmsClientError with cause
			await expect(signPromise).rejects.toThrow(KmsClientError);
			await expect(signPromise).rejects.toThrow(
				'Failed to sign message with KMS',
			);
		});

		it('should throw KmsClientError when sign receives KeyUnavailableException', async () => {
			// given: KmsClient and mocked KeyUnavailableException
			const client = new KmsClient(MOCK_KMS_CONFIG);
			const message = new Uint8Array([1, 2, 3]);
			const awsError = new Error(
				'The request was rejected because the specified KMS key is not available',
			);
			awsError.name = 'KeyUnavailableException';
			mockSend.mockRejectedValueOnce(awsError);

			// when: Signing message with unavailable key
			const signPromise = client.sign(message);

			// then: Should throw KmsClientError with cause
			await expect(signPromise).rejects.toThrow(KmsClientError);
			await expect(signPromise).rejects.toThrow(
				'Failed to sign message with KMS',
			);
		});

		it('should handle signing empty message appropriately', async () => {
			// given: KmsClient and empty message
			const client = new KmsClient(MOCK_KMS_CONFIG);
			const emptyMessage = new Uint8Array(0);

			mockSend.mockResolvedValueOnce({
				Signature: MOCK_SIGNATURE,
			});

			// when: Signing empty message
			const signature = await client.sign(emptyMessage);

			// then: Should successfully return signature (AWS KMS allows empty messages)
			expect(signature).toBeInstanceOf(Uint8Array);
			expect(signature.length).toBe(64);
			expect(mockSend).toHaveBeenCalledTimes(1);
		});

		it('should throw KmsClientError on network timeout simulation', async () => {
			// given: KmsClient and mocked network timeout
			const client = new KmsClient(MOCK_KMS_CONFIG);
			const message = new Uint8Array([1, 2, 3]);
			const timeoutError = new Error('Connection timeout after 10000ms');
			timeoutError.name = 'TimeoutError';
			mockSend.mockRejectedValueOnce(timeoutError);

			// when: Signing message with network timeout
			const signPromise = client.sign(message);

			// then: Should throw KmsClientError with timeout cause
			await expect(signPromise).rejects.toThrow(KmsClientError);
			await expect(signPromise).rejects.toThrow(
				'Failed to sign message with KMS',
			);

			// then: Verify cause is preserved in error
			mockSend.mockRejectedValueOnce(timeoutError);
			try {
				await client.sign(message);
			} catch (error) {
				expect(error).toBeInstanceOf(KmsClientError);
				expect((error as KmsClientError).cause).toBe(timeoutError);
			}
		});
	});

	describe('Edge Cases', () => {
		it('should throw KmsClientError when getPublicKey response has null PublicKey', async () => {
			// given: KmsClient and response with null PublicKey
			const client = new KmsClient(MOCK_KMS_CONFIG);
			mockSend.mockResolvedValueOnce({
				PublicKey: null,
			});

			// when: Getting public key with null response
			const getPublicKeyPromise = client.getPublicKey();

			// then: Should throw KmsClientError
			await expect(getPublicKeyPromise).rejects.toThrow(KmsClientError);
			await expect(getPublicKeyPromise).rejects.toThrow(
				'GetPublicKey response missing PublicKey field',
			);
		});

		it('should throw KmsClientError when sign response has null Signature', async () => {
			// given: KmsClient and response with null Signature
			const client = new KmsClient(MOCK_KMS_CONFIG);
			const message = new Uint8Array([1, 2, 3]);
			mockSend.mockResolvedValueOnce({
				Signature: null,
			});

			// when: Signing message with null response
			const signPromise = client.sign(message);

			// then: Should throw KmsClientError
			await expect(signPromise).rejects.toThrow(KmsClientError);
			await expect(signPromise).rejects.toThrow(
				'Sign response missing Signature field',
			);
		});

		it('should throw KmsClientError when signature length is not 64 bytes', async () => {
			// given: KmsClient and invalid signature length (e.g., 32 bytes)
			const client = new KmsClient(MOCK_KMS_CONFIG);
			const message = new Uint8Array([1, 2, 3]);
			const invalidSignature = new Uint8Array(32); // Wrong length
			mockSend.mockResolvedValueOnce({
				Signature: invalidSignature,
			});

			// when: Receiving signature with wrong length
			const signPromise = client.sign(message);

			// then: Should throw KmsClientError with length validation message
			await expect(signPromise).rejects.toThrow(KmsClientError);
			await expect(signPromise).rejects.toThrow(
				'Invalid signature length: expected 64 bytes, got 32 bytes',
			);
		});
	});
});

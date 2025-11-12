import {
	GetPublicKeyCommand,
	KMSClient,
	SignCommand,
} from '@aws-sdk/client-kms';
import { KmsClientError } from '../errors/index.js';
import type { KmsConfig } from '../types/index.js';

/**
 * AWS KMS client wrapper for ED25519 key operations.
 *
 * Provides methods to retrieve public keys and sign messages using
 * AWS KMS ED25519 keys (KeySpec: ECC_ED25519).
 *
 * @example
 * ```typescript
 * const client = new KmsClient({
 *   region: 'us-east-1',
 *   keyId: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012'
 * });
 *
 * const publicKey = await client.getPublicKey();
 * const signature = await client.sign(message);
 * ```
 */
export class KmsClient {
	private readonly kmsClient: KMSClient;
	private readonly config: KmsConfig;

	/**
	 * Creates a new KmsClient instance.
	 *
	 * @param config - Configuration for AWS KMS connection
	 */
	constructor(config: KmsConfig) {
		this.config = config;
		this.kmsClient = new KMSClient({
			region: config.region,
			credentials: config.credentials,
		});
	}

	/**
	 * Retrieves the public key from AWS KMS.
	 *
	 * Returns DER-encoded SubjectPublicKeyInfo (X.509 format).
	 * Use `extractEd25519PublicKey` to extract the raw 32-byte public key.
	 *
	 * @returns DER-encoded public key as Uint8Array (typically 42-44 bytes)
	 * @throws {KmsClientError} If KMS API call fails
	 *
	 * @example
	 * ```typescript
	 * const derPublicKey = await client.getPublicKey();
	 * const rawPublicKey = extractEd25519PublicKey(derPublicKey);
	 * ```
	 */
	async getPublicKey(): Promise<Uint8Array> {
		try {
			const command = new GetPublicKeyCommand({
				KeyId: this.config.keyId,
			});

			const response = await this.kmsClient.send(command);

			if (!response.PublicKey) {
				throw new KmsClientError(
					'GetPublicKey response missing PublicKey field',
				);
			}

			// Convert Buffer/Uint8Array to Uint8Array
			return new Uint8Array(response.PublicKey);
		} catch (error) {
			if (error instanceof KmsClientError) {
				throw error;
			}
			throw new KmsClientError(
				`Failed to get public key from KMS: ${error instanceof Error ? error.message : String(error)}`,
				error,
			);
		}
	}

	/**
	 * Signs a message using the ED25519 key in AWS KMS.
	 *
	 * @param message - Message to sign as Uint8Array
	 * @returns ED25519 signature (64 bytes)
	 * @throws {KmsClientError} If KMS API call fails or signature is invalid
	 *
	 * @example
	 * ```typescript
	 * const message = new TextEncoder().encode('Hello, Solana!');
	 * const signature = await client.sign(message);
	 * console.log('Signature length:', signature.length); // 64
	 * ```
	 */
	async sign(message: Uint8Array): Promise<Uint8Array> {
		try {
			const command = new SignCommand({
				KeyId: this.config.keyId,
				Message: message,
				MessageType: 'RAW',
				SigningAlgorithm: 'ED25519_SHA_512',
			});

			const response = await this.kmsClient.send(command);

			if (!response.Signature) {
				throw new KmsClientError('Sign response missing Signature field');
			}

			const signature = new Uint8Array(response.Signature);

			// Validate signature length (ED25519 signatures are always 64 bytes)
			if (signature.length !== 64) {
				throw new KmsClientError(
					`Invalid signature length: expected 64 bytes, got ${signature.length} bytes`,
				);
			}

			return signature;
		} catch (error) {
			if (error instanceof KmsClientError) {
				throw error;
			}
			throw new KmsClientError(
				`Failed to sign message with KMS: ${error instanceof Error ? error.message : String(error)}`,
				error,
			);
		}
	}
}

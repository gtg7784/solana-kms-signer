/**
 * Solana KMS Signer
 *
 * A TypeScript library for signing Solana transactions using AWS KMS with ED25519 keys.
 *
 * @module solana-kms-signer
 */

// Re-export commonly used Solana types for convenience
export { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
// Error classes
export {
	KmsClientError,
	PublicKeyExtractionError,
	SignatureVerificationError,
} from './errors/index.js';
// Core classes
export { KmsClient } from './kms/client.js';
export { SolanaKmsSigner } from './kms/signer.js';
// Type definitions
export type { KmsConfig, SolanaKmsSignerConfig } from './types/index.js';
// Utility functions
export { extractEd25519PublicKey } from './utils/publicKey.js';

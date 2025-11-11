/**
 * Solana KMS Signer
 *
 * A TypeScript library for signing Solana transactions using AWS KMS with ED25519 keys.
 *
 * @module solana-kms-signer
 */

// Core classes
export { KmsClient } from './kms/client.js';
export { SolanaKmsSigner } from './kms/signer.js';

// Utility functions
export { extractEd25519PublicKey } from './utils/publicKey.js';

// Type definitions
export type { KmsConfig, SolanaKmsSignerConfig } from './types/index.js';

// Error classes
export {
  KmsClientError,
  PublicKeyExtractionError,
  SignatureVerificationError,
} from './errors/index.js';

// Re-export commonly used Solana types for convenience
export { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';

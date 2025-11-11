import {
  PublicKey,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';
import nacl from 'tweetnacl';
import { KmsClient } from './client.js';
import { extractEd25519PublicKey } from '../utils/publicKey.js';
import type { KmsConfig } from '../types/index.js';
import { SignatureVerificationError } from '../errors/index.js';

/**
 * Solana transaction signer using AWS KMS ED25519 keys.
 *
 * Provides methods to sign Solana transactions and arbitrary messages
 * using AWS KMS-managed ED25519 keys. Caches the public key after
 * first retrieval to minimize KMS API calls.
 *
 * @example
 * ```typescript
 * // Create with KmsConfig
 * const signer = new SolanaKmsSigner({
 *   region: 'us-east-1',
 *   keyId: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012'
 * });
 *
 * // Or create with existing KmsClient
 * const client = new KmsClient(config);
 * const signer = new SolanaKmsSigner(client);
 *
 * // Get public key
 * const publicKey = await signer.getPublicKey();
 *
 * // Sign message
 * const message = new TextEncoder().encode('Hello, Solana!');
 * const signature = await signer.signMessage(message);
 *
 * // Sign transaction
 * const transaction = new Transaction().add(instruction);
 * transaction.recentBlockhash = recentBlockhash;
 * transaction.feePayer = publicKey;
 * const signedTx = await signer.signTransaction(transaction);
 * ```
 */
export class SolanaKmsSigner {
  private readonly kmsClient: KmsClient;
  private publicKey?: PublicKey;
  private rawPublicKey?: Uint8Array;

  /**
   * Creates a new SolanaKmsSigner instance.
   *
   * @param config - Either KmsConfig or an existing KmsClient instance
   *
   * @example
   * ```typescript
   * // With KmsConfig
   * const signer = new SolanaKmsSigner({
   *   region: 'us-east-1',
   *   keyId: 'key-id'
   * });
   *
   * // With KmsClient
   * const client = new KmsClient(config);
   * const signer = new SolanaKmsSigner(client);
   * ```
   */
  constructor(config: KmsConfig | KmsClient) {
    if (config instanceof KmsClient) {
      this.kmsClient = config;
    } else {
      this.kmsClient = new KmsClient(config);
    }
  }

  /**
   * Retrieves the Solana PublicKey associated with the KMS key.
   *
   * The public key is cached after first retrieval to minimize KMS API calls.
   *
   * @returns Solana PublicKey object
   * @throws {KmsClientError} If KMS API call fails
   * @throws {PublicKeyExtractionError} If DER decoding fails
   *
   * @example
   * ```typescript
   * const publicKey = await signer.getPublicKey();
   * console.log('Address:', publicKey.toBase58());
   * ```
   */
  async getPublicKey(): Promise<PublicKey> {
    // Return cached public key if available
    if (this.publicKey) {
      return this.publicKey;
    }

    // Get DER-encoded public key from KMS
    const derPublicKey = await this.kmsClient.getPublicKey();

    // Extract raw 32-byte ED25519 public key
    const rawPublicKey = extractEd25519PublicKey(derPublicKey);

    // Create Solana PublicKey and cache both forms
    this.rawPublicKey = rawPublicKey;
    this.publicKey = new PublicKey(rawPublicKey);

    return this.publicKey;
  }

  /**
   * Retrieves the raw 32-byte ED25519 public key.
   *
   * The public key is cached after first retrieval to minimize KMS API calls.
   *
   * @returns Raw 32-byte public key as Uint8Array
   * @throws {KmsClientError} If KMS API call fails
   * @throws {PublicKeyExtractionError} If DER decoding fails
   *
   * @example
   * ```typescript
   * const rawPublicKey = await signer.getRawPublicKey();
   * console.log('Raw public key length:', rawPublicKey.length); // 32
   * ```
   */
  async getRawPublicKey(): Promise<Uint8Array> {
    // Return cached raw public key if available
    if (this.rawPublicKey) {
      return this.rawPublicKey;
    }

    // Get DER-encoded public key from KMS
    const derPublicKey = await this.kmsClient.getPublicKey();

    // Extract raw 32-byte ED25519 public key
    this.rawPublicKey = extractEd25519PublicKey(derPublicKey);

    return this.rawPublicKey;
  }

  /**
   * Signs an arbitrary message using the KMS key.
   *
   * The signature is verified using tweetnacl before being returned
   * to ensure cryptographic correctness.
   *
   * @param message - Message to sign as Uint8Array
   * @returns ED25519 signature (64 bytes)
   * @throws {KmsClientError} If KMS API call fails
   * @throws {SignatureVerificationError} If signature verification fails
   *
   * @example
   * ```typescript
   * const message = new TextEncoder().encode('Hello, Solana!');
   * const signature = await signer.signMessage(message);
   * console.log('Signature length:', signature.length); // 64
   * ```
   */
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    // Get signature from KMS
    const signature = await this.kmsClient.sign(message);

    // Get raw public key for verification
    const rawPublicKey = await this.getRawPublicKey();

    // Verify signature using tweetnacl
    const isValid = nacl.sign.detached.verify(
      message,
      signature,
      rawPublicKey
    );

    if (!isValid) {
      throw new SignatureVerificationError(
        'Signature verification failed: signature does not match public key and message'
      );
    }

    return signature;
  }

  /**
   * Signs a Solana legacy Transaction.
   *
   * The transaction must have recentBlockhash and feePayer set before signing.
   *
   * @param transaction - Transaction to sign
   * @returns Signed transaction
   * @throws {KmsClientError} If KMS API call fails
   * @throws {SignatureVerificationError} If signature verification fails
   *
   * @example
   * ```typescript
   * const transaction = new Transaction().add(instruction);
   * transaction.recentBlockhash = recentBlockhash;
   * transaction.feePayer = await signer.getPublicKey();
   * const signedTx = await signer.signTransaction(transaction);
   * ```
   */
  async signTransaction(transaction: Transaction): Promise<Transaction> {
    // Get public key for signing
    const publicKey = await this.getPublicKey();

    // Serialize transaction message
    const message = transaction.serializeMessage();

    // Sign the serialized message
    const signature = await this.signMessage(message);

    // Add signature to transaction
    transaction.addSignature(publicKey, Buffer.from(signature));

    return transaction;
  }

  /**
   * Signs a Solana VersionedTransaction.
   *
   * The transaction must have a valid message with recentBlockhash set.
   *
   * @param transaction - VersionedTransaction to sign
   * @returns Signed versioned transaction
   * @throws {KmsClientError} If KMS API call fails
   * @throws {SignatureVerificationError} If signature verification fails
   *
   * @example
   * ```typescript
   * const message = MessageV0.compile({
   *   payerKey: await signer.getPublicKey(),
   *   instructions: [instruction],
   *   recentBlockhash: recentBlockhash
   * });
   * const transaction = new VersionedTransaction(message);
   * const signedTx = await signer.signVersionedTransaction(transaction);
   * ```
   */
  async signVersionedTransaction(
    transaction: VersionedTransaction
  ): Promise<VersionedTransaction> {
    // Serialize transaction message
    const message = transaction.message.serialize();

    // Sign the serialized message
    const signature = await this.signMessage(message);

    // Add signature to transaction's signatures array
    transaction.addSignature(await this.getPublicKey(), Buffer.from(signature));

    return transaction;
  }

  /**
   * Signs multiple Solana transactions in parallel.
   *
   * All transactions must have recentBlockhash and feePayer set before signing.
   *
   * @param transactions - Array of transactions to sign
   * @returns Array of signed transactions in the same order
   * @throws {KmsClientError} If any KMS API call fails
   * @throws {SignatureVerificationError} If any signature verification fails
   *
   * @example
   * ```typescript
   * const transactions = [tx1, tx2, tx3];
   * const signedTxs = await signer.signAllTransactions(transactions);
   * ```
   */
  async signAllTransactions(
    transactions: Transaction[]
  ): Promise<Transaction[]> {
    return Promise.all(
      transactions.map((transaction) => this.signTransaction(transaction))
    );
  }
}

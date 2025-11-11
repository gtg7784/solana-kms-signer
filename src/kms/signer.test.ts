import { vi, beforeEach, describe, it, expect, Mock } from 'vitest';
import nacl from 'tweetnacl';
import {
  PublicKey,
  Transaction,
  VersionedTransaction,
  SystemProgram,
  TransactionMessage,
  Blockhash,
} from '@solana/web3.js';
import { SignatureVerificationError, KmsClientError } from '../errors/index.js';
import type { KmsConfig } from '../types/index.js';

// Mock KmsClient before importing SolanaKmsSigner
const mockGetPublicKey = vi.fn();
const mockSign = vi.fn();

vi.mock('./client.js', () => ({
  KmsClient: class {
    getPublicKey = mockGetPublicKey;
    sign = mockSign;
  },
}));

// Import after mocking
import { SolanaKmsSigner } from './signer.js';

/**
 * Generate cryptographically valid test data using tweetnacl.
 * This ensures our mock signatures can pass nacl.sign.detached.verify().
 */
const testKeyPair = nacl.sign.keyPair();
const TEST_PUBLIC_KEY = testKeyPair.publicKey; // 32 bytes
const TEST_SECRET_KEY = testKeyPair.secretKey; // 64 bytes

/**
 * Create valid DER-encoded public key matching AWS KMS format.
 * Uses actual test public key for signature verification.
 */
const createDerPublicKey = (publicKey: Uint8Array): Uint8Array => {
  return new Uint8Array([
    0x30, 0x2a, // SEQUENCE, 42 bytes
    0x30, 0x05, // AlgorithmIdentifier SEQUENCE, 5 bytes
    0x06, 0x03, 0x2b, 0x65, 0x70, // OID: 1.3.101.112 (Ed25519)
    0x03, 0x21, 0x00, // BIT STRING, 33 bytes (32 + 1 padding)
    ...publicKey, // 32-byte ED25519 public key
  ]);
};

const MOCK_DER_PUBLIC_KEY = createDerPublicKey(TEST_PUBLIC_KEY);

/**
 * Mock KMS configuration
 */
const MOCK_KMS_CONFIG: KmsConfig = {
  region: 'us-east-1',
  keyId: 'arn:aws:kms:us-east-1:123456789012:key/test-key-id',
};

/**
 * Create cryptographically valid signature for a message.
 * Uses the test secret key to generate signatures that will pass verification.
 */
const createValidSignature = (message: Uint8Array): Uint8Array => {
  return nacl.sign.detached(message, TEST_SECRET_KEY);
};

/**
 * Mock recentBlockhash for transaction testing
 */
const MOCK_RECENT_BLOCKHASH: Blockhash = 'GH7ome3EiwEr7tu9JuTh2dpYWBJK3z69Xm1ZE3MEE6JC';

describe('SolanaKmsSigner', () => {
  beforeEach(() => {
    // Reset mock state before each test
    mockGetPublicKey.mockReset();
    mockSign.mockReset();
  });

  describe('Happy Path', () => {
    it('should successfully retrieve PublicKey object and convert to Base58', async () => {
      // given: SolanaKmsSigner with mocked KmsClient
      mockGetPublicKey.mockResolvedValueOnce(MOCK_DER_PUBLIC_KEY);
      const signer = new SolanaKmsSigner(MOCK_KMS_CONFIG);

      // when: Getting public key
      const publicKey = await signer.getPublicKey();

      // then: Should return valid PublicKey object
      expect(publicKey).toBeInstanceOf(PublicKey);
      expect(publicKey.toBytes()).toEqual(TEST_PUBLIC_KEY);

      // then: Should be able to convert to Base58 format
      const base58 = publicKey.toBase58();
      expect(typeof base58).toBe('string');
      expect(base58.length).toBeGreaterThan(0);

      // then: Should have called KMS getPublicKey once
      expect(mockGetPublicKey).toHaveBeenCalledTimes(1);
    });

    it('should cache public key and not call KMS API on second call', async () => {
      // given: SolanaKmsSigner with mocked KmsClient
      mockGetPublicKey.mockResolvedValueOnce(MOCK_DER_PUBLIC_KEY);
      const signer = new SolanaKmsSigner(MOCK_KMS_CONFIG);

      // when: Getting public key twice
      const publicKey1 = await signer.getPublicKey();
      const publicKey2 = await signer.getPublicKey();

      // then: Should return same PublicKey instance
      expect(publicKey1).toBe(publicKey2);

      // then: KMS API should be called only once (cached after first call)
      expect(mockGetPublicKey).toHaveBeenCalledTimes(1);
    });

    it('should successfully retrieve raw 32-byte public key', async () => {
      // given: SolanaKmsSigner with mocked KmsClient
      mockGetPublicKey.mockResolvedValueOnce(MOCK_DER_PUBLIC_KEY);
      const signer = new SolanaKmsSigner(MOCK_KMS_CONFIG);

      // when: Getting raw public key
      const rawPublicKey = await signer.getRawPublicKey();

      // then: Should return 32-byte Uint8Array
      expect(rawPublicKey).toBeInstanceOf(Uint8Array);
      expect(rawPublicKey.length).toBe(32);
      expect(rawPublicKey).toEqual(TEST_PUBLIC_KEY);
    });

    it('should successfully sign message and return 64-byte signature', async () => {
      // given: SolanaKmsSigner and message to sign
      mockGetPublicKey.mockResolvedValueOnce(MOCK_DER_PUBLIC_KEY);
      const message = new TextEncoder().encode('Hello, Solana!');
      const validSignature = createValidSignature(message);
      mockSign.mockResolvedValueOnce(validSignature);

      const signer = new SolanaKmsSigner(MOCK_KMS_CONFIG);

      // when: Signing message
      const signature = await signer.signMessage(message);

      // then: Should return 64-byte signature
      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBe(64);

      // then: Signature should be cryptographically valid
      const isValid = nacl.sign.detached.verify(message, signature, TEST_PUBLIC_KEY);
      expect(isValid).toBe(true);

      // then: Should have called KMS sign
      expect(mockSign).toHaveBeenCalledWith(message);
    });

    it('should successfully sign Transaction and validate signatures array', async () => {
      // given: SolanaKmsSigner and valid Transaction
      mockGetPublicKey.mockResolvedValueOnce(MOCK_DER_PUBLIC_KEY);
      const signer = new SolanaKmsSigner(MOCK_KMS_CONFIG);

      // Create valid transaction
      const publicKey = await signer.getPublicKey();
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey,
          lamports: 1000,
        })
      );
      transaction.recentBlockhash = MOCK_RECENT_BLOCKHASH;
      transaction.feePayer = publicKey;

      // Mock signature generation
      const messageBytes = transaction.serializeMessage();
      const validSignature = createValidSignature(messageBytes);
      mockSign.mockResolvedValueOnce(validSignature);

      // when: Signing transaction
      const signedTx = await signer.signTransaction(transaction);

      // then: Should return signed Transaction
      expect(signedTx).toBeInstanceOf(Transaction);

      // then: Signatures array should contain valid signature
      expect(signedTx.signatures).toHaveLength(1);
      expect(signedTx.signatures[0].publicKey.equals(publicKey)).toBe(true);
      expect(signedTx.signatures[0].signature).not.toBeNull();
      expect(signedTx.signatures[0].signature?.length).toBe(64);
    });

    it('should successfully sign VersionedTransaction', async () => {
      // given: SolanaKmsSigner and valid VersionedTransaction
      mockGetPublicKey.mockResolvedValueOnce(MOCK_DER_PUBLIC_KEY);
      const signer = new SolanaKmsSigner(MOCK_KMS_CONFIG);

      // Create valid versioned transaction
      const publicKey = await signer.getPublicKey();
      const instruction = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: publicKey,
        lamports: 1000,
      });

      const message = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: MOCK_RECENT_BLOCKHASH,
        instructions: [instruction],
      }).compileToV0Message();

      const transaction = new VersionedTransaction(message);

      // Mock signature generation
      const messageBytes = transaction.message.serialize();
      const validSignature = createValidSignature(messageBytes);
      mockSign.mockResolvedValueOnce(validSignature);

      // when: Signing versioned transaction
      const signedTx = await signer.signVersionedTransaction(transaction);

      // then: Should return signed VersionedTransaction
      expect(signedTx).toBeInstanceOf(VersionedTransaction);

      // then: Signatures array should contain valid signature
      expect(signedTx.signatures).toHaveLength(1);
      expect(signedTx.signatures[0].length).toBe(64);
    });

    it('should successfully sign all transactions using Promise.all', async () => {
      // given: SolanaKmsSigner and multiple transactions
      mockGetPublicKey.mockResolvedValueOnce(MOCK_DER_PUBLIC_KEY);
      const signer = new SolanaKmsSigner(MOCK_KMS_CONFIG);

      // Create multiple valid transactions
      const publicKey = await signer.getPublicKey();
      const transactions = [1, 2, 3].map(() => {
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: publicKey,
            lamports: 1000,
          })
        );
        tx.recentBlockhash = MOCK_RECENT_BLOCKHASH;
        tx.feePayer = publicKey;
        return tx;
      });

      // Mock signature generation for all transactions
      transactions.forEach((tx) => {
        const messageBytes = tx.serializeMessage();
        const validSignature = createValidSignature(messageBytes);
        mockSign.mockResolvedValueOnce(validSignature);
      });

      // when: Signing all transactions
      const signedTxs = await signer.signAllTransactions(transactions);

      // then: Should return array of signed transactions
      expect(signedTxs).toHaveLength(3);
      signedTxs.forEach((signedTx) => {
        expect(signedTx).toBeInstanceOf(Transaction);
        expect(signedTx.signatures).toHaveLength(1);
        expect(signedTx.signatures[0].signature).not.toBeNull();
      });

      // then: Should have called sign for each transaction
      expect(mockSign).toHaveBeenCalledTimes(3);
    });
  });

  describe('Failure Paths', () => {
    it('should throw SignatureVerificationError when signature is invalid', async () => {
      // given: SolanaKmsSigner and invalid signature from KMS
      mockGetPublicKey.mockResolvedValueOnce(MOCK_DER_PUBLIC_KEY);
      const message = new TextEncoder().encode('Hello, Solana!');

      // Create invalid signature (random bytes that won't verify)
      const invalidSignature = new Uint8Array(64).fill(0xff);
      mockSign.mockResolvedValueOnce(invalidSignature);

      const signer = new SolanaKmsSigner(MOCK_KMS_CONFIG);

      // when: Signing message with invalid signature
      const signPromise = signer.signMessage(message);

      // then: Should throw SignatureVerificationError
      await expect(signPromise).rejects.toThrow(SignatureVerificationError);
      await expect(signPromise).rejects.toThrow('Signature verification failed');
    });

    it('should throw error when signature length is not 64 bytes', async () => {
      // given: SolanaKmsSigner and wrong length signature from KMS
      mockGetPublicKey.mockResolvedValueOnce(MOCK_DER_PUBLIC_KEY);
      const message = new TextEncoder().encode('Hello, Solana!');

      // Create wrong length signature (32 bytes instead of 64)
      const wrongLengthSignature = new Uint8Array(32).fill(0xaa);
      mockSign.mockResolvedValueOnce(wrongLengthSignature);

      const signer = new SolanaKmsSigner(MOCK_KMS_CONFIG);

      // when: Signing message with wrong length signature
      const signPromise = signer.signMessage(message);

      // then: Should throw error (nacl throws "bad signature size" Error)
      await expect(signPromise).rejects.toThrow('bad signature size');
    });

    it('should throw error when signTransaction receives transaction without recentBlockhash', async () => {
      // given: SolanaKmsSigner and transaction without recentBlockhash
      mockGetPublicKey.mockResolvedValueOnce(MOCK_DER_PUBLIC_KEY);
      const signer = new SolanaKmsSigner(MOCK_KMS_CONFIG);

      const publicKey = await signer.getPublicKey();
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey,
          lamports: 1000,
        })
      );
      // Note: not setting recentBlockhash or feePayer

      // when: Attempting to sign invalid transaction
      const signPromise = signer.signTransaction(transaction);

      // then: Should throw error during serializeMessage()
      await expect(signPromise).rejects.toThrow();
    });

    it('should propagate error when signTransaction message serialization fails', async () => {
      // given: SolanaKmsSigner and transaction that will fail serialization
      mockGetPublicKey.mockResolvedValueOnce(MOCK_DER_PUBLIC_KEY);
      const signer = new SolanaKmsSigner(MOCK_KMS_CONFIG);

      const publicKey = await signer.getPublicKey();
      const transaction = new Transaction();
      transaction.recentBlockhash = MOCK_RECENT_BLOCKHASH;
      transaction.feePayer = publicKey;
      // Empty transaction with no instructions

      // Mock sign to throw error
      mockSign.mockRejectedValueOnce(new Error('Message serialization error'));

      // when: Attempting to sign with serialization error
      const signPromise = signer.signTransaction(transaction);

      // then: Error should propagate to caller
      await expect(signPromise).rejects.toThrow();
    });

    it('should propagate KmsClientError when KMS getPublicKey fails', async () => {
      // given: SolanaKmsSigner with KMS that fails getPublicKey
      const kmsError = new KmsClientError('Failed to get public key from KMS');
      mockGetPublicKey.mockRejectedValueOnce(kmsError);

      const signer = new SolanaKmsSigner(MOCK_KMS_CONFIG);

      // when: Getting public key from failing KMS
      const getPublicKeyPromise = signer.getPublicKey();

      // then: KmsClientError should propagate to caller
      await expect(getPublicKeyPromise).rejects.toThrow(KmsClientError);
      await expect(getPublicKeyPromise).rejects.toThrow('Failed to get public key from KMS');
    });

    it('should propagate KmsClientError when KMS sign fails', async () => {
      // given: SolanaKmsSigner with KMS that fails sign
      mockGetPublicKey.mockResolvedValueOnce(MOCK_DER_PUBLIC_KEY);
      const kmsError = new KmsClientError('Failed to sign message with KMS');
      mockSign.mockRejectedValueOnce(kmsError);

      const signer = new SolanaKmsSigner(MOCK_KMS_CONFIG);
      const message = new TextEncoder().encode('Hello, Solana!');

      // when: Signing message with failing KMS
      const signPromise = signer.signMessage(message);

      // then: KmsClientError should propagate to caller
      await expect(signPromise).rejects.toThrow(KmsClientError);
      await expect(signPromise).rejects.toThrow('Failed to sign message with KMS');
    });

    it('should successfully create SolanaKmsSigner with KmsConfig', () => {
      // given: Valid KmsConfig
      const config: KmsConfig = MOCK_KMS_CONFIG;

      // when: Creating signer with KmsConfig
      const signer = new SolanaKmsSigner(config);

      // then: Should create signer successfully
      expect(signer).toBeInstanceOf(SolanaKmsSigner);
    });

    it('should return empty array when signAllTransactions receives empty array', async () => {
      // given: SolanaKmsSigner and empty transaction array
      const signer = new SolanaKmsSigner(MOCK_KMS_CONFIG);

      // when: Signing empty array
      const signedTxs = await signer.signAllTransactions([]);

      // then: Should return empty array
      expect(signedTxs).toEqual([]);
      expect(signedTxs).toHaveLength(0);

      // then: Should not call any KMS methods
      expect(mockSign).not.toHaveBeenCalled();
    });

    it('should reject Promise.all when one transaction fails in signAllTransactions', async () => {
      // given: SolanaKmsSigner and multiple transactions where one will fail
      mockGetPublicKey.mockResolvedValueOnce(MOCK_DER_PUBLIC_KEY);
      const signer = new SolanaKmsSigner(MOCK_KMS_CONFIG);

      const publicKey = await signer.getPublicKey();
      const transactions = [1, 2, 3].map(() => {
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: publicKey,
            lamports: 1000,
          })
        );
        tx.recentBlockhash = MOCK_RECENT_BLOCKHASH;
        tx.feePayer = publicKey;
        return tx;
      });

      // Mock first signature to succeed, second to fail
      const firstMessage = transactions[0].serializeMessage();
      const validSignature = createValidSignature(firstMessage);
      mockSign.mockResolvedValueOnce(validSignature);

      // Second call fails
      const signError = new KmsClientError('KMS service unavailable');
      mockSign.mockRejectedValueOnce(signError);

      // when: Signing all transactions with one failure
      const signAllPromise = signer.signAllTransactions(transactions);

      // then: Promise.all should reject with the first error
      await expect(signAllPromise).rejects.toThrow(KmsClientError);
      await expect(signAllPromise).rejects.toThrow('KMS service unavailable');
    });
  });
});

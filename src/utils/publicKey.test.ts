import { PublicKeyExtractionError } from '../errors/index.js';
import { extractEd25519PublicKey } from './publicKey.js';

/**
 * Mock DER-encoded ED25519 public key matching AWS KMS GetPublicKey format.
 * Structure:
 * - 30 2a: SEQUENCE, 42 bytes
 * - 30 05: AlgorithmIdentifier SEQUENCE
 * - 06 03 2b 65 70: OID 1.3.101.112 (Ed25519)
 * - 03 21 00: BIT STRING, 33 bytes (32 bytes + 1 padding)
 * - [32 bytes]: Mock public key data
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

describe('extractEd25519PublicKey', () => {
	describe('Happy Path', () => {
		it('should extract 32-byte public key from valid DER encoding', () => {
			// given: Valid DER-encoded public key from AWS KMS
			const derEncoded = MOCK_DER_PUBLIC_KEY;

			// when: Extracting public key
			const publicKey = extractEd25519PublicKey(derEncoded);

			// then: Should return exactly 32 bytes
			expect(publicKey).toBeInstanceOf(Uint8Array);
			expect(publicKey.length).toBe(32);

			// then: Should match the mock public key bytes (starting at offset 12)
			const expectedPublicKey = new Uint8Array([
				0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c,
				0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18,
				0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20,
			]);
			expect(publicKey).toEqual(expectedPublicKey);
		});
	});

	describe('Failure Paths', () => {
		it('should throw PublicKeyExtractionError when SEQUENCE tag is missing', () => {
			// given: Invalid DER with wrong first byte (not 0x30)
			const invalidDer = new Uint8Array([
				0x31,
				0x2a, // Wrong tag (0x31 instead of 0x30)
				0x30,
				0x05,
				0x06,
				0x03,
				0x2b,
				0x65,
				0x70,
				0x03,
				0x21,
				0x00,
				...new Array(32).fill(0x01),
			]);

			// when & then: Should throw PublicKeyExtractionError
			expect(() => extractEd25519PublicKey(invalidDer)).toThrow(
				PublicKeyExtractionError,
			);
			expect(() => extractEd25519PublicKey(invalidDer)).toThrow(
				'Invalid DER encoding: missing SEQUENCE tag',
			);
		});

		it('should throw PublicKeyExtractionError when BIT STRING tag is missing', () => {
			// given: Invalid DER without BIT STRING tag (0x03)
			const invalidDer = new Uint8Array([
				0x30,
				0x2a, // SEQUENCE
				0x30,
				0x05, // AlgorithmIdentifier
				0x06,
				0x03,
				0x2b,
				0x65,
				0x70, // OID
				0x04,
				0x21,
				0x00, // Wrong tag (0x04 instead of 0x03)
				...new Array(32).fill(0x01),
			]);

			// when & then: Should throw PublicKeyExtractionError
			expect(() => extractEd25519PublicKey(invalidDer)).toThrow(
				PublicKeyExtractionError,
			);
			expect(() => extractEd25519PublicKey(invalidDer)).toThrow(
				'Invalid DER encoding: missing BIT STRING',
			);
		});

		it('should throw PublicKeyExtractionError when BIT STRING length is incorrect', () => {
			// given: Invalid DER with wrong BIT STRING length (0x20 instead of 0x21)
			const invalidDer = new Uint8Array([
				0x30,
				0x2a, // SEQUENCE
				0x30,
				0x05, // AlgorithmIdentifier
				0x06,
				0x03,
				0x2b,
				0x65,
				0x70, // OID
				0x03,
				0x20,
				0x00, // Wrong length (0x20 = 32 instead of 0x21 = 33)
				...new Array(32).fill(0x01),
			]);

			// when & then: Should throw PublicKeyExtractionError with specific message
			expect(() => extractEd25519PublicKey(invalidDer)).toThrow(
				PublicKeyExtractionError,
			);
			expect(() => extractEd25519PublicKey(invalidDer)).toThrow(
				'Unexpected BIT STRING length: expected 0x21 (33 bytes), got 0x20',
			);
		});

		it('should throw PublicKeyExtractionError when input is empty', () => {
			// given: Empty Uint8Array
			const emptyInput = new Uint8Array(0);

			// when & then: Should throw PublicKeyExtractionError
			expect(() => extractEd25519PublicKey(emptyInput)).toThrow(
				PublicKeyExtractionError,
			);
			expect(() => extractEd25519PublicKey(emptyInput)).toThrow(
				'Invalid DER encoding: missing SEQUENCE tag',
			);
		});

		it('should throw error when input is null or undefined', () => {
			// given: Null input
			const nullInput = null as unknown as Uint8Array;

			// when & then: Should throw TypeError (not PublicKeyExtractionError)
			// Note: This tests TypeScript runtime behavior - null/undefined are not Uint8Array
			expect(() => extractEd25519PublicKey(nullInput)).toThrow();

			// given: Undefined input
			const undefinedInput = undefined as unknown as Uint8Array;

			// when & then: Should throw TypeError
			expect(() => extractEd25519PublicKey(undefinedInput)).toThrow();
		});
	});
});

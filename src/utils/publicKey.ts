import { PublicKeyExtractionError } from '../errors/index.js';

/**
 * Extracts a 32-byte ED25519 public key from DER-encoded SubjectPublicKeyInfo.
 *
 * AWS KMS GetPublicKey returns DER-encoded public keys in X.509 SubjectPublicKeyInfo format:
 * ```
 * 30 2a          # SEQUENCE, 42 bytes
 *   30 05        # SEQUENCE, 5 bytes (AlgorithmIdentifier)
 *     06 03      # OID, 3 bytes
 *       2b 65 70 # 1.3.101.112 (Ed25519)
 *   03 21 00     # BIT STRING, 33 bytes (32 bytes + 1 byte padding)
 *     [32 bytes] # ED25519 public key
 * ```
 *
 * This function extracts the raw 32-byte public key from the DER structure.
 *
 * @param derEncoded - DER-encoded SubjectPublicKeyInfo from AWS KMS
 * @returns Raw 32-byte ED25519 public key
 * @throws {PublicKeyExtractionError} If the DER encoding is invalid or unexpected
 *
 * @example
 * ```typescript
 * const derEncoded = await kmsClient.getPublicKey();
 * const rawPublicKey = extractEd25519PublicKey(derEncoded);
 * // rawPublicKey is Uint8Array of 32 bytes
 * ```
 */
export function extractEd25519PublicKey(derEncoded: Uint8Array): Uint8Array {
	// Validate DER structure - first byte must be SEQUENCE tag (0x30)
	if (derEncoded[0] !== 0x30) {
		throw new PublicKeyExtractionError(
			'Invalid DER encoding: missing SEQUENCE tag',
		);
	}

	// Parse AlgorithmIdentifier SEQUENCE to find where BIT STRING starts
	// Position 2 should be another SEQUENCE tag for AlgorithmIdentifier
	if (derEncoded[2] !== 0x30) {
		throw new PublicKeyExtractionError(
			'Invalid DER encoding: missing AlgorithmIdentifier SEQUENCE',
		);
	}

	// Get length of AlgorithmIdentifier content
	const algorithmIdentifierLength = derEncoded[3];

	// BIT STRING starts after AlgorithmIdentifier SEQUENCE
	// Position = 4 (first content byte) + algorithmIdentifierLength
	const bitStringIndex = 4 + algorithmIdentifierLength;

	// Verify BIT STRING tag (0x03)
	if (derEncoded[bitStringIndex] !== 0x03) {
		throw new PublicKeyExtractionError(
			'Invalid DER encoding: missing BIT STRING',
		);
	}

	// Verify BIT STRING length (0x21 = 33 bytes: 1 byte unused bits + 32 bytes public key)
	const bitStringLength = derEncoded[bitStringIndex + 1];
	if (bitStringLength !== 0x21) {
		throw new PublicKeyExtractionError(
			`Unexpected BIT STRING length: expected 0x21 (33 bytes), got 0x${bitStringLength.toString(16)}`,
		);
	}

	// First byte after length is unused bits (0x00), next 32 bytes is the public key
	const publicKeyStart = bitStringIndex + 3;
	return derEncoded.slice(publicKeyStart, publicKeyStart + 32);
}

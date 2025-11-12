# Solana KMS Signer

A TypeScript library for signing Solana transactions using AWS KMS with ED25519 keys.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![npm](https://img.shields.io/npm/v/solana-kms-signer.svg)](https://www.npmjs.com/package/solana-kms-signer)
[![AWS KMS](https://img.shields.io/badge/AWS-KMS-orange.svg)](https://aws.amazon.com/kms/)

## Features

- **AWS KMS Integration**: Leverage AWS KMS's ED25519 key management for secure Solana transaction signing
- **Type Safety**: Full TypeScript support with strict type checking
- **Solana Compatibility**: Support for both legacy `Transaction` and `VersionedTransaction`
- **Public Key Caching**: Automatic caching to minimize KMS API calls
- **Signature Verification**: Built-in signature verification using tweetnacl
- **Multiple Signatures**: Batch signing support for multiple transactions
- **Error Handling**: Comprehensive error types with detailed messages
- **Zero Dependencies**: Minimal external dependencies (only AWS SDK, Solana Web3.js, and tweetnacl)

## Prerequisites

- **Node.js**: Version 16.0.0 or higher
- **AWS Account**: With appropriate IAM permissions
- **AWS KMS**: ED25519 key created in KMS (see setup instructions below)

## Installation

Using pnpm:
```bash
pnpm add solana-kms-signer
```

Using npm:
```bash
npm install solana-kms-signer
```

Using yarn:
```bash
yarn add solana-kms-signer
```

## AWS KMS Setup

### Creating an ED25519 Key

You can create an ED25519 key using the AWS CLI or the AWS Console.

#### Using AWS CLI

```bash
aws kms create-key \
  --key-spec ECC_NIST_EDWARDS25519 \
  --key-usage SIGN_VERIFY \
  --description "ED25519 key for Solana transaction signing" \
  --region us-east-1
```

**Important**: Use the exact KeySpec value `ECC_NIST_EDWARDS25519` (not `ECC_ED25519` or `ED25519`).

#### Using the Example Script

Please create a KMS key with the following specifications:
- KeySpec: ECC_NIST_EDWARDS25519
- KeyUsage: SIGN_VERIFY
- Description: ED25519 key for Solana transaction signing
- Region: us-east-1

**Example:**
```bash
aws kms create-key \
  --key-spec ECC_NIST_EDWARDS25519 \
  --key-usage SIGN_VERIFY \
  --description "ED25519 key for Solana transaction signing" \
  --region us-east-1
```

### Required IAM Permissions

Your AWS credentials must have the following KMS permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "kms:GetPublicKey",
        "kms:Sign"
      ],
      "Resource": "arn:aws:kms:REGION:ACCOUNT:key/KEY_ID"
    }
  ]
}
```

For creating keys, you also need:
```json
{
  "Effect": "Allow",
  "Action": [
    "kms:CreateKey",
    "kms:TagResource"
  ],
  "Resource": "*"
}
```

## Quick Start

### Environment Setup

Create a `.env` file:

```bash
# AWS KMS Configuration
AWS_REGION=us-east-1
AWS_KMS_KEY_ID=arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012

# AWS Credentials (optional - will use default credential chain if not provided)
# AWS_ACCESS_KEY_ID=your-access-key
# AWS_SECRET_ACCESS_KEY=your-secret-key
# AWS_SESSION_TOKEN=your-session-token

# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
```

### Basic Usage

```typescript
import { SolanaKmsSigner } from 'solana-kms-signer';
import { Connection, SystemProgram, Transaction } from '@solana/web3.js';

// Initialize the signer
const signer = new SolanaKmsSigner({
  region: 'us-east-1',
  keyId: 'your-kms-key-id'
});

// Get the public key
const publicKey = await signer.getPublicKey();
console.log('Solana Address:', publicKey.toBase58());

// Sign a message
const message = Buffer.from('Hello, Solana!');
const signature = await signer.signMessage(message);

// Sign a transaction
const connection = new Connection('https://api.devnet.solana.com');
const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

const transaction = new Transaction({
  recentBlockhash,
  feePayer: publicKey
}).add(
  SystemProgram.transfer({
    fromPubkey: publicKey,
    toPubkey: recipientPubkey,
    lamports: 1000000 // 0.001 SOL
  })
);

const signedTransaction = await signer.signTransaction(transaction);
const txid = await connection.sendRawTransaction(signedTransaction.serialize());
console.log('Transaction ID:', txid);
```

## API Reference

### `SolanaKmsSigner`

The main class for signing Solana transactions with AWS KMS.

#### Constructor

```typescript
new SolanaKmsSigner(config: KmsConfig | KmsClient)
```

Creates a new signer instance.

**Parameters:**
- `config`: Either a `KmsConfig` object or an existing `KmsClient` instance

**KmsConfig Type:**
```typescript
interface KmsConfig {
  region: string;
  keyId: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
}
```

**Example:**
```typescript
// With KmsConfig
const signer = new SolanaKmsSigner({
  region: 'us-east-1',
  keyId: 'your-key-id'
});

// With existing KmsClient
import { KmsClient } from 'solana-kms-signer';
const client = new KmsClient(config);
const signer = new SolanaKmsSigner(client);
```

#### Methods

##### `getPublicKey(): Promise<PublicKey>`

Retrieves the Solana PublicKey associated with the KMS key. The public key is cached after first retrieval.

**Returns:** `Promise<PublicKey>` - Solana PublicKey object

**Throws:**
- `KmsClientError` - If KMS API call fails
- `PublicKeyExtractionError` - If DER decoding fails

**Example:**
```typescript
const publicKey = await signer.getPublicKey();
console.log('Address:', publicKey.toBase58());
```

##### `getRawPublicKey(): Promise<Uint8Array>`

Retrieves the raw 32-byte ED25519 public key. The public key is cached after first retrieval.

**Returns:** `Promise<Uint8Array>` - Raw 32-byte public key

**Throws:**
- `KmsClientError` - If KMS API call fails
- `PublicKeyExtractionError` - If DER decoding fails

**Example:**
```typescript
const rawPublicKey = await signer.getRawPublicKey();
console.log('Raw public key length:', rawPublicKey.length); // 32
```

##### `signMessage(message: Uint8Array): Promise<Uint8Array>`

Signs an arbitrary message using the KMS key. The signature is verified using tweetnacl before being returned.

**Parameters:**
- `message`: Message to sign as Uint8Array

**Returns:** `Promise<Uint8Array>` - ED25519 signature (64 bytes)

**Throws:**
- `KmsClientError` - If KMS API call fails
- `SignatureVerificationError` - If signature verification fails

**Example:**
```typescript
const message = new TextEncoder().encode('Hello, Solana!');
const signature = await signer.signMessage(message);
console.log('Signature length:', signature.length); // 64
```

##### `signTransaction(transaction: Transaction): Promise<Transaction>`

Signs a Solana legacy Transaction. The transaction must have `recentBlockhash` and `feePayer` set before signing.

**Parameters:**
- `transaction`: Transaction to sign

**Returns:** `Promise<Transaction>` - Signed transaction

**Throws:**
- `KmsClientError` - If KMS API call fails
- `SignatureVerificationError` - If signature verification fails

**Example:**
```typescript
const transaction = new Transaction().add(instruction);
transaction.recentBlockhash = recentBlockhash;
transaction.feePayer = await signer.getPublicKey();
const signedTx = await signer.signTransaction(transaction);
```

##### `signVersionedTransaction(transaction: VersionedTransaction): Promise<VersionedTransaction>`

Signs a Solana VersionedTransaction. The transaction must have a valid message with `recentBlockhash` set.

**Parameters:**
- `transaction`: VersionedTransaction to sign

**Returns:** `Promise<VersionedTransaction>` - Signed versioned transaction

**Throws:**
- `KmsClientError` - If KMS API call fails
- `SignatureVerificationError` - If signature verification fails

**Example:**
```typescript
import { MessageV0, VersionedTransaction } from '@solana/web3.js';

const message = MessageV0.compile({
  payerKey: await signer.getPublicKey(),
  instructions: [instruction],
  recentBlockhash: recentBlockhash
});
const transaction = new VersionedTransaction(message);
const signedTx = await signer.signVersionedTransaction(transaction);
```

##### `signAllTransactions(transactions: Transaction[]): Promise<Transaction[]>`

Signs multiple Solana transactions in parallel. All transactions must have `recentBlockhash` and `feePayer` set before signing.

**Parameters:**
- `transactions`: Array of transactions to sign

**Returns:** `Promise<Transaction[]>` - Array of signed transactions in the same order

**Throws:**
- `KmsClientError` - If any KMS API call fails
- `SignatureVerificationError` - If any signature verification fails

**Example:**
```typescript
const transactions = [tx1, tx2, tx3];
const signedTxs = await signer.signAllTransactions(transactions);
```

### Error Classes

The library exports the following error classes:

#### `KmsClientError`

Thrown when AWS KMS API calls fail.

```typescript
class KmsClientError extends Error {
  cause?: unknown;
}
```

#### `PublicKeyExtractionError`

Thrown when DER-encoded public key extraction fails.

```typescript
class PublicKeyExtractionError extends Error {
  cause?: unknown;
}
```

#### `SignatureVerificationError`

Thrown when signature verification fails after signing.

```typescript
class SignatureVerificationError extends Error {
  cause?: unknown;
}
```

## Configuration

### Environment Variables

The library supports the following environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `AWS_REGION` | Yes | AWS region where the KMS key is located (e.g., `us-east-1`) |
| `AWS_KMS_KEY_ID` | Yes | KMS key ID or ARN |
| `AWS_ACCESS_KEY_ID` | No | AWS access key (uses default credential chain if not provided) |
| `AWS_SECRET_ACCESS_KEY` | No | AWS secret key (uses default credential chain if not provided) |
| `AWS_SESSION_TOKEN` | No | AWS session token (for temporary credentials) |
| `SOLANA_RPC_URL` | No | Solana RPC endpoint (for examples) |

### AWS Credential Chain

If you don't provide explicit credentials, the AWS SDK will use the default credential chain:

1. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
2. AWS credentials file (`~/.aws/credentials`)
3. IAM role (when running on EC2, ECS, Lambda, etc.)

## Examples

This library includes several example scripts demonstrating different use cases:

### 1. Sign Message

Sign an arbitrary message:

```bash
pnpm example:sign-message
```

**Script:** [`examples/sign-message.ts`](examples/sign-message.ts)

### 2. Sign Transaction

Sign a Solana legacy transaction:

```bash
pnpm example:sign-transaction
```

**Script:** [`examples/sign-transaction.ts`](examples/sign-transaction.ts)

### 3. Sign Versioned Transaction

Sign a Solana versioned transaction:

```bash
pnpm example:sign-versioned-transaction
```

**Script:** [`examples/sign-versioned-transaction.ts`](examples/sign-versioned-transaction.ts)

### 4. Multiple Signatures

Sign multiple transactions in parallel:

```bash
pnpm example:multiple-signatures
```

**Script:** [`examples/multiple-signatures.ts`](examples/multiple-signatures.ts)

## Development

### Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/yourusername/solana-kms-signer.git
cd solana-kms-signer
pnpm install
```

### Building

Build the TypeScript code:

```bash
pnpm build
```

### Testing

Run tests:

```bash
# Run tests in watch mode
pnpm test

# Run tests once
pnpm test:run

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage
```

Current test coverage: **97.4%** (46 tests passing)

### Type Checking

Run TypeScript type checking:

```bash
pnpm type-check
```

## Troubleshooting

### Error: "InvalidKeyUsage"

**Problem:** The KMS key was not created with `SIGN_VERIFY` usage.

**Solution:** Create a new key with the correct KeyUsage:
```bash
aws kms create-key \
  --key-spec ECC_NIST_EDWARDS25519 \
  --key-usage SIGN_VERIFY
```

### Error: "UnsupportedOperationException"

**Problem:** The KMS key was created with the wrong KeySpec.

**Solution:** Ensure you're using `ECC_NIST_EDWARDS25519` (not `ECC_ED25519` or `ED25519`):
```bash
aws kms create-key \
  --key-spec ECC_NIST_EDWARDS25519 \
  --key-usage SIGN_VERIFY
```

### Error: "AccessDeniedException"

**Problem:** Your AWS credentials don't have sufficient KMS permissions.

**Solution:** Add the required IAM permissions:
```json
{
  "Effect": "Allow",
  "Action": [
    "kms:GetPublicKey",
    "kms:Sign"
  ],
  "Resource": "arn:aws:kms:REGION:ACCOUNT:key/KEY_ID"
}
```

### Error: "Public key extraction failed"

**Problem:** The DER-encoded public key from KMS has an unexpected format.

**Solution:** This usually indicates the key was created with the wrong KeySpec. Verify your key was created with `ECC_NIST_EDWARDS25519`:
```bash
aws kms describe-key --key-id your-key-id
```

### Error: "Signature verification failed"

**Problem:** The signature from KMS doesn't match the public key and message.

**Solution:** This is a critical error that should not occur in normal operation. Possible causes:
- Network corruption (rare)
- KMS service issue (very rare)
- Bug in the library (please report!)

If this error occurs consistently, please [open an issue](https://github.com/yourusername/solana-kms-signer/issues).

## Security Best Practices

### Key Management

1. **Never export private keys**: AWS KMS keys cannot be exported by design. This is a security feature, not a limitation.
2. **Use key policies**: Restrict access to your KMS keys using IAM policies and key policies.
3. **Enable CloudTrail**: Log all KMS API calls for audit purposes.
4. **Consider key rotation**: While KMS doesn't support automatic rotation for asymmetric keys, you can implement manual rotation.
5. **Use separate keys**: Use different KMS keys for different environments (dev, staging, production).

### Credential Management

1. **Use IAM roles**: When running on AWS infrastructure (EC2, ECS, Lambda), use IAM roles instead of access keys.
2. **Never commit credentials**: Never commit AWS credentials to version control. Use `.env` files and add them to `.gitignore`.
3. **Use temporary credentials**: When possible, use temporary credentials (STS) instead of long-lived access keys.
4. **Rotate credentials**: Regularly rotate your AWS access keys.

### Application Security

1. **Validate inputs**: Always validate transaction inputs before signing.
2. **Verify balances**: Check account balances before signing transfer transactions.
3. **Use recent blockhashes**: Always use a recent blockhash to prevent replay attacks.
4. **Test on devnet first**: Test your integration on Solana devnet before using on mainnet.
5. **Implement rate limiting**: Rate limit signing operations to prevent abuse.

### Cost Management

1. **Cache public keys**: The library automatically caches public keys to minimize KMS API calls.
2. **Batch operations**: Use `signAllTransactions()` to sign multiple transactions efficiently.
3. **Monitor usage**: Monitor your KMS usage through AWS Cost Explorer.

**AWS KMS Pricing:**
- Key storage: ~$1/month per key
- API calls: $0.03 per 10,000 requests
- GetPublicKey: Free

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by [EVM KMS Signer](https://github.com/gtg7784/evm-kms-signer)
- Built with [AWS SDK for JavaScript v3](https://github.com/aws/aws-sdk-js-v3)
- Uses [Solana Web3.js](https://github.com/solana-labs/solana-web3.js)
- Signature verification powered by [TweetNaCl](https://github.com/dchest/tweetnacl-js)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Search [existing issues](https://github.com/yourusername/solana-kms-signer/issues)
3. [Open a new issue](https://github.com/yourusername/solana-kms-signer/issues/new)

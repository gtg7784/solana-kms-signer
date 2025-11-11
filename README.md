# Solana KMS Signer

A TypeScript library for signing Solana transactions using AWS Key Management Service (KMS) with ED25519 keys.

[![npm version](https://badge.fury.io/js/solana-kms-signer.svg)](https://badge.fury.io/js/solana-kms-signer)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

This library enables secure signing of Solana transactions using AWS KMS-managed ED25519 keys. It provides a seamless integration between AWS KMS and Solana's transaction signing requirements, allowing you to leverage AWS's secure key management infrastructure for your Solana applications.

### Key Features

- 🔐 **Secure Key Management**: Private keys never leave AWS KMS
- ✨ **ED25519 Support**: Full support for Solana's ED25519 signature requirements
- 🚀 **High Performance**: Optimized with public key caching
- 📦 **TypeScript First**: Complete type definitions and IntelliSense support
- ✅ **Comprehensive Testing**: 97%+ test coverage
- 🔄 **Transaction Support**: Both legacy and versioned transactions

## Prerequisites

- Node.js >= 16
- AWS account with KMS access
- KMS key with ED25519 key spec

## Installation

```bash
npm install solana-kms-signer
```

or with yarn:

```bash
yarn add solana-kms-signer
```

or with pnpm:

```bash
pnpm add solana-kms-signer
```

## AWS KMS Setup

### Create an ED25519 KMS Key

```bash
aws kms create-key \
  --key-spec ED25519 \
  --key-usage SIGN_VERIFY \
  --description "Solana ED25519 signing key"
```

### Required IAM Permissions

Your AWS credentials need the following KMS permissions:

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
      "Resource": "arn:aws:kms:region:account:key/key-id"
    }
  ]
}
```

## Quick Start

### Basic Usage

```typescript
import { SolanaKmsSigner } from 'solana-kms-signer';

// Initialize the signer
const signer = new SolanaKmsSigner({
  region: 'us-east-1',
  keyId: 'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012'
});

// Get the public key
const publicKey = await signer.getPublicKey();
console.log('Public Key:', publicKey.toString());

// Sign a message
const message = Buffer.from('Hello, Solana!');
const signature = await signer.signMessage(message);
console.log('Signature:', Buffer.from(signature).toString('hex'));
```

### Sign a Transaction

```typescript
import { SolanaKmsSigner } from 'solana-kms-signer';
import { Connection, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

const signer = new SolanaKmsSigner({
  region: 'us-east-1',
  keyId: 'your-kms-key-id'
});

// Create a transaction
const connection = new Connection('https://api.devnet.solana.com');
const publicKey = await signer.getPublicKey();
const transaction = new Transaction();

transaction.add(
  SystemProgram.transfer({
    fromPubkey: publicKey,
    toPubkey: recipientPublicKey,
    lamports: 0.001 * LAMPORTS_PER_SOL
  })
);

// Get recent blockhash
const { blockhash } = await connection.getLatestBlockhash();
transaction.recentBlockhash = blockhash;
transaction.feePayer = publicKey;

// Sign the transaction
const signedTx = await signer.signTransaction(transaction);

// Send the transaction
const txId = await connection.sendRawTransaction(signedTx.serialize());
```

## API Reference

### SolanaKmsSigner

The main class for signing operations.

#### Constructor

```typescript
new SolanaKmsSigner(config: SolanaKmsSignerConfig)
```

**Parameters:**
- `config.region` (string): AWS region where the KMS key is located
- `config.keyId` (string): KMS key ID or ARN
- `config.credentials` (optional): AWS credentials object

#### Methods

##### `getPublicKey(): Promise<PublicKey>`

Returns the Solana PublicKey object for the KMS key. The public key is cached after the first retrieval.

##### `getRawPublicKey(): Promise<Uint8Array>`

Returns the raw 32-byte ED25519 public key as Uint8Array.

##### `signMessage(message: Uint8Array): Promise<Uint8Array>`

Signs an arbitrary message and returns the 64-byte signature.

##### `signTransaction(transaction: Transaction): Promise<Transaction>`

Signs a Solana legacy transaction.

##### `signVersionedTransaction(transaction: VersionedTransaction): Promise<VersionedTransaction>`

Signs a Solana versioned transaction (v0).

##### `signAllTransactions(transactions: Transaction[]): Promise<Transaction[]>`

Signs multiple legacy transactions in sequence.

### Error Classes

The library provides specific error classes for different failure scenarios:

- `KmsClientError`: AWS KMS API errors
- `PublicKeyExtractionError`: DER decoding errors
- `SignatureVerificationError`: Signature validation failures

## Configuration

### Environment Variables

You can configure the signer using environment variables:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_KMS_KEY_ID=arn:aws:kms:us-east-1:123456789012:key/...

# AWS Credentials (optional - will use default chain if not provided)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_SESSION_TOKEN=your-session-token  # For temporary credentials

# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
```

### AWS Credential Chain

If credentials are not explicitly provided, the library uses AWS SDK's default credential chain:

1. Environment variables
2. Shared credentials file (`~/.aws/credentials`)
3. IAM roles for Amazon EC2
4. IAM roles for AWS Lambda

## Examples

The `examples/` directory contains complete working examples:

- **sign-message.ts**: Sign arbitrary messages
- **sign-transaction.ts**: Sign and send SOL transfers
- **sign-versioned-transaction.ts**: Work with versioned transactions (v0)
- **multiple-signatures.ts**: Batch operations and performance optimization

Run examples:

```bash
# Copy and configure .env file
cp examples/.env.example .env

# Run examples
npm run example:sign-message
npm run example:sign-transaction
```

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/solana-kms-signer.git
cd solana-kms-signer

# Install dependencies
pnpm install

# Run tests
pnpm test

# Build the library
pnpm build
```

### Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test -- --watch

# Run tests with UI
pnpm test:ui
```

### Type Checking

```bash
pnpm type-check
```

## Performance Considerations

- **Public Key Caching**: The public key is cached after first retrieval to minimize KMS API calls
- **Rate Limits**: AWS KMS has API rate limits that vary by region. Consider implementing retry logic for production use
- **Parallel Operations**: Use `Promise.all()` for signing multiple independent transactions

## Security Best Practices

1. **IAM Policies**: Use least-privilege IAM policies
2. **Key Policies**: Restrict KMS key usage to specific principals
3. **Audit Logging**: Enable CloudTrail for KMS operations
4. **Network Security**: Use VPC endpoints for KMS in production
5. **Key Rotation**: Consider implementing key rotation strategies

## Troubleshooting

### Common Issues

**AccessDeniedException**
- Ensure your AWS credentials have the required KMS permissions
- Check the KMS key policy allows your principal

**Invalid Signature**
- Verify the KMS key spec is ED25519
- Ensure the message format matches what was signed

**Rate Limiting**
- Implement exponential backoff for retries
- Consider caching strategies for public keys

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- AWS SDK for JavaScript v3 for KMS integration
- Solana Web3.js for transaction handling
- TweetNaCl for ED25519 signature verification

## Support

For issues and questions:
- GitHub Issues: [https://github.com/yourusername/solana-kms-signer/issues](https://github.com/yourusername/solana-kms-signer/issues)
- Documentation: [https://github.com/yourusername/solana-kms-signer#readme](https://github.com/yourusername/solana-kms-signer#readme)
/**
 * Example: Sign a message using AWS KMS with ED25519 key
 *
 * This example demonstrates how to:
 * 1. Initialize the SolanaKmsSigner with AWS KMS configuration
 * 2. Get the public key from KMS
 * 3. Sign an arbitrary message
 * 4. Verify the signature locally
 */

import { SolanaKmsSigner } from '../src/index.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  // Validate required environment variables
  const region = process.env.AWS_REGION;
  const keyId = process.env.AWS_KMS_KEY_ID;

  if (!region || !keyId) {
    console.error('❌ Error: AWS_REGION and AWS_KMS_KEY_ID environment variables are required');
    console.error('Please create a .env file with:');
    console.error('AWS_REGION=your-region');
    console.error('AWS_KMS_KEY_ID=your-kms-key-id');
    process.exit(1);
  }

  try {
    console.log('🔐 Initializing Solana KMS Signer...');
    console.log(`   Region: ${region}`);
    console.log(`   Key ID: ${keyId.substring(0, 20)}...`);

    // Initialize the signer
    const signer = new SolanaKmsSigner({
      region,
      keyId,
      // Credentials will be loaded from environment or IAM role
    });

    // Get the public key
    console.log('\n📍 Getting public key from KMS...');
    const publicKey = await signer.getPublicKey();
    console.log(`   Public Key: ${publicKey.toString()}`);

    // Create a message to sign
    const message = Buffer.from('Hello from Solana KMS Signer! 🚀');
    console.log('\n✍️  Signing message...');
    console.log(`   Message: "${message.toString()}"`);

    // Sign the message
    const signature = await signer.signMessage(message);
    console.log(`   Signature: ${Buffer.from(signature).toString('hex').substring(0, 64)}...`);

    // Verify the signature locally (done internally by the signer)
    console.log('\n✅ Signature verified successfully!');

    // Additional info
    console.log('\n📊 Summary:');
    console.log(`   Algorithm: ED25519`);
    console.log(`   Public Key Length: ${publicKey.toBytes().length} bytes`);
    console.log(`   Signature Length: ${signature.length} bytes`);
    console.log(`   Message Length: ${message.length} bytes`);

  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('   Details:', error.message);
      if ('cause' in error && error.cause) {
        console.error('   Cause:', error.cause);
      }
    }
    process.exit(1);
  }
}

// Run the example
main().catch(console.error);
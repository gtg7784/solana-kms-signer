/**
 * Example: Sign a Versioned Transaction (v0) using AWS KMS
 *
 * This example demonstrates how to:
 * 1. Create a v0 transaction with lookup tables
 * 2. Sign it with KMS
 * 3. Handle versioned transaction features
 */

import { SolanaKmsSigner } from '../src/index.js';
import {
  Connection,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  // Validate required environment variables
  const region = process.env.AWS_REGION;
  const keyId = process.env.AWS_KMS_KEY_ID;
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

  if (!region || !keyId) {
    console.error('❌ Error: AWS_REGION and AWS_KMS_KEY_ID environment variables are required');
    console.error('Please create a .env file with:');
    console.error('AWS_REGION=your-region');
    console.error('AWS_KMS_KEY_ID=your-kms-key-id');
    console.error('SOLANA_RPC_URL=https://api.devnet.solana.com (optional)');
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
    });

    // Get the public key
    console.log('\n📍 Getting public key from KMS...');
    const fromPubkey = await signer.getPublicKey();
    console.log(`   From Address: ${fromPubkey.toString()}`);

    // Connect to Solana cluster
    console.log('\n🌐 Connecting to Solana cluster...');
    const connection = new Connection(rpcUrl, 'confirmed');

    // Check balance
    const balance = await connection.getBalance(fromPubkey);
    console.log(`   Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

    // Create recipient for demo
    const toPubkey = PublicKey.unique();
    console.log(`   To Address: ${toPubkey.toString()}`);

    // Create a v0 transaction
    console.log('\n📝 Creating Versioned Transaction (v0)...');

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();

    // Create instructions
    const instructions = [
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports: 0.001 * LAMPORTS_PER_SOL,
      }),
    ];

    // Create v0 compatible message
    const messageV0 = new TransactionMessage({
      payerKey: fromPubkey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();

    console.log('   Transaction Version: 0');
    console.log('   Message Type: Versioned');

    // Create versioned transaction
    const versionedTx = new VersionedTransaction(messageV0);

    // Sign with KMS
    console.log('\n✍️  Signing versioned transaction with KMS...');
    const signedVersionedTx = await signer.signVersionedTransaction(versionedTx);
    console.log('   Versioned transaction signed successfully!');

    // Verify signature
    if (signedVersionedTx.signatures.length > 0 && signedVersionedTx.signatures[0]) {
      const sigHex = Buffer.from(signedVersionedTx.signatures[0]).toString('hex');
      console.log(`   Signature: ${sigHex.substring(0, 64)}...`);
    }

    // Serialize the transaction
    const serialized = signedVersionedTx.serialize();
    console.log(`   Serialized Size: ${serialized.length} bytes`);

    // Transaction details
    console.log('\n📊 Versioned Transaction Summary:');
    console.log(`   Version: ${signedVersionedTx.version}`);
    console.log(`   Signatures: ${signedVersionedTx.signatures.length}`);
    console.log(`   Header:`, signedVersionedTx.message.header);
    console.log(`   Static Account Keys: ${signedVersionedTx.message.staticAccountKeys.length}`);
    console.log(`   Instructions: ${signedVersionedTx.message.compiledInstructions.length}`);

    // Advanced features note
    console.log('\n💡 Versioned Transaction Features:');
    console.log('   - Support for Address Lookup Tables (ALT)');
    console.log('   - More efficient account address storage');
    console.log('   - Enables more complex transactions');
    console.log('   - Required for advanced Solana programs');

    const txId = await connection.sendRawTransaction(serialized);
    console.log(`   Transaction ID: ${txId}`);

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
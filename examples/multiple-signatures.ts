/**
 * Example: Multiple signatures and batch operations
 *
 * This example demonstrates how to:
 * 1. Sign multiple messages efficiently
 * 2. Sign multiple transactions
 * 3. Handle batch operations with KMS
 */

import { SolanaKmsSigner } from '../src/index.js';
import {
  Connection,
  PublicKey,
  Transaction,
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
    process.exit(1);
  }

  try {
    console.log('🔐 Initializing Solana KMS Signer...');

    // Initialize the signer
    const signer = new SolanaKmsSigner({
      region,
      keyId,
    });

    // Get the public key (cached after first call)
    const publicKey = await signer.getPublicKey();
    console.log(`   Public Key: ${publicKey.toString()}`);

    // Connect to Solana
    const connection = new Connection(rpcUrl, 'confirmed');

    console.log('\n📝 Example 1: Sign Multiple Messages');
    console.log('   Signing 5 different messages...');

    const messages = [
      'First message',
      'Second message',
      'Third message with special chars: 🚀✨',
      'Fourth message with numbers: 12345',
      'Fifth message with long content: ' + 'x'.repeat(100),
    ];

    const startTime = Date.now();
    const signatures = [];

    for (let i = 0; i < messages.length; i++) {
      const message = Buffer.from(messages[i]);
      const signature = await signer.signMessage(message);
      signatures.push(signature);
      console.log(`   ✓ Message ${i + 1} signed (${message.length} bytes)`);
    }

    const elapsed = Date.now() - startTime;
    console.log(`   Total time: ${elapsed}ms (${Math.round(elapsed / messages.length)}ms per signature)`);

    console.log('\n📝 Example 2: Sign Multiple Transactions');
    console.log('   Creating 3 different transactions...');

    // Get recent blockhash once
    const { blockhash } = await connection.getLatestBlockhash();

    // Create multiple transactions
    const transactions = [];
    const recipients = [
      PublicKey.unique(),
      PublicKey.unique(),
      PublicKey.unique(),
    ];

    for (let i = 0; i < recipients.length; i++) {
      const tx = new Transaction();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      // Different amounts for each transaction
      const amount = (i + 1) * 0.001 * LAMPORTS_PER_SOL;

      tx.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipients[i],
          lamports: amount,
        })
      );

      transactions.push(tx);
      console.log(`   Transaction ${i + 1}: Transfer ${amount / LAMPORTS_PER_SOL} SOL to ${recipients[i].toString().substring(0, 8)}...`);
    }

    console.log('\n   Signing transactions...');
    const txStartTime = Date.now();
    const signedTransactions = [];

    for (let i = 0; i < transactions.length; i++) {
      const signedTx = await signer.signTransaction(transactions[i]);
      signedTransactions.push(signedTx);
      console.log(`   ✓ Transaction ${i + 1} signed`);
    }

    const txElapsed = Date.now() - txStartTime;
    console.log(`   Total time: ${txElapsed}ms (${Math.round(txElapsed / transactions.length)}ms per transaction)`);

    console.log('\n📝 Example 3: Parallel vs Sequential Operations');
    console.log('   Note: AWS KMS has rate limits, but we can optimize with:');
    console.log('   - Public key caching (already implemented)');
    console.log('   - Connection pooling in AWS SDK');
    console.log('   - Batch processing where supported');

    // Sign all transactions at once (Promise.all)
    console.log('\n   Attempting parallel signing (3 transactions)...');
    const parallelStart = Date.now();

    // Create new transactions for parallel test
    const parallelTxs = recipients.map((recipient, i) => {
      const tx = new Transaction();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;
      tx.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipient,
          lamports: 0.001 * LAMPORTS_PER_SOL,
        })
      );
      return tx;
    });

    // Sign in parallel
    const parallelSigned = await Promise.all(
      parallelTxs.map((tx, i) => {
        console.log(`   → Starting signature ${i + 1}`);
        return signer.signTransaction(tx);
      })
    );

    const parallelElapsed = Date.now() - parallelStart;
    console.log(`   ✓ All transactions signed in parallel`);
    console.log(`   Parallel time: ${parallelElapsed}ms`);
    console.log(`   Sequential time (from earlier): ${txElapsed}ms`);
    console.log(`   Speedup: ${((txElapsed / parallelElapsed - 1) * 100).toFixed(1)}%`);

    console.log('\n📊 Performance Summary:');
    console.log(`   Messages signed: ${signatures.length}`);
    console.log(`   Transactions signed: ${signedTransactions.length + parallelSigned.length}`);
    console.log(`   Public key cached: Yes (1 KMS call instead of ${1 + signatures.length + signedTransactions.length + parallelSigned.length})`);
    console.log(`   Total KMS Sign calls: ${signatures.length + signedTransactions.length + parallelSigned.length}`);

    console.log('\n💡 Best Practices:');
    console.log('   - Cache public key (automatic in this library)');
    console.log('   - Use parallel signing when possible');
    console.log('   - Consider AWS KMS rate limits (varies by region)');
    console.log('   - Monitor CloudWatch metrics for KMS usage');

  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('   Details:', error.message);
    }
    process.exit(1);
  }
}

// Run the example
main().catch(console.error);
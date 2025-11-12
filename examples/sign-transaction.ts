/**
 * Example: Sign a Solana transaction using AWS KMS
 *
 * This example demonstrates how to:
 * 1. Initialize the SolanaKmsSigner with AWS KMS configuration
 * 2. Create a simple SOL transfer transaction
 * 3. Sign the transaction with KMS
 * 4. Prepare the transaction for broadcast
 */

import {
	Connection,
	LAMPORTS_PER_SOL,
	PublicKey,
	SystemProgram,
	Transaction,
} from '@solana/web3.js';
import * as dotenv from 'dotenv';
import { SolanaKmsSigner } from '../src/index.js';

// Load environment variables
dotenv.config();

async function main() {
	// Validate required environment variables
	const region = process.env.AWS_REGION;
	const keyId = process.env.AWS_KMS_KEY_ID;
	const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
	const recipientAddress = process.env.RECIPIENT_ADDRESS;

	if (!region || !keyId) {
		console.error(
			'❌ Error: AWS_REGION and AWS_KMS_KEY_ID environment variables are required',
		);
		console.error('Please create a .env file with:');
		console.error('AWS_REGION=your-region');
		console.error('AWS_KMS_KEY_ID=your-kms-key-id');
		console.error('SOLANA_RPC_URL=https://api.devnet.solana.com (optional)');
		console.error('RECIPIENT_ADDRESS=recipient-solana-address (optional)');
		process.exit(1);
	}

	try {
		console.log('🔐 Initializing Solana KMS Signer...');
		console.log(`   Region: ${region}`);
		console.log(`   Key ID: ${keyId.substring(0, 20)}...`);
		console.log(`   RPC URL: ${rpcUrl}`);

		// Initialize the signer
		const signer = new SolanaKmsSigner({
			region,
			keyId,
			// Credentials will be loaded from environment or IAM role
		});

		// Get the public key
		console.log('\n📍 Getting public key from KMS...');
		const fromPubkey = await signer.getPublicKey();
		console.log(`   From Address: ${fromPubkey.toString()}`);

		// Connect to Solana cluster
		console.log('\n🌐 Connecting to Solana cluster...');
		const connection = new Connection(rpcUrl, 'confirmed');

		// Get cluster info
		const version = await connection.getVersion();
		console.log(`   Cluster Version: ${version['solana-core']}`);

		// Check balance
		const balance = await connection.getBalance(fromPubkey);
		console.log(`   Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

		if (balance === 0) {
			console.log('\n⚠️  Warning: Account has 0 SOL balance');
			console.log(
				'   For devnet, you can get test SOL from: https://faucet.solana.com',
			);
			console.log('   Continuing with transaction creation example...');
		}

		// Use provided recipient or create a random one for demo
		const toPubkey = recipientAddress
			? new PublicKey(recipientAddress)
			: PublicKey.unique(); // Random address for demo

		console.log(`   To Address: ${toPubkey.toString()}`);

		// Create a simple transfer transaction
		console.log('\n📝 Creating transaction...');
		const transaction = new Transaction();

		// Add a transfer instruction (0.001 SOL)
		const transferAmount = 0.001 * LAMPORTS_PER_SOL;
		transaction.add(
			SystemProgram.transfer({
				fromPubkey,
				toPubkey,
				lamports: transferAmount,
			}),
		);

		console.log(`   Type: Transfer`);
		console.log(`   Amount: ${transferAmount / LAMPORTS_PER_SOL} SOL`);

		// Get recent blockhash
		console.log('\n🔄 Getting recent blockhash...');
		const { blockhash } = await connection.getLatestBlockhash();
		transaction.recentBlockhash = blockhash;
		transaction.feePayer = fromPubkey;
		console.log(`   Blockhash: ${blockhash.substring(0, 20)}...`);

		// Sign the transaction with KMS
		console.log('\n✍️  Signing transaction with KMS...');
		const signedTx = await signer.signTransaction(transaction);
		console.log('   Transaction signed successfully!');

		// Verify signature exists
		if (signedTx.signatures.length > 0 && signedTx.signatures[0].signature) {
			const sigHex = Buffer.from(signedTx.signatures[0].signature).toString(
				'hex',
			);
			console.log(`   Signature: ${sigHex.substring(0, 64)}...`);
		}

		// Serialize for sending
		const serialized = signedTx.serialize();
		console.log(`   Serialized Size: ${serialized.length} bytes`);

		// Display transaction details
		console.log('\n📊 Transaction Summary:');
		console.log(`   From: ${fromPubkey.toString()}`);
		console.log(`   To: ${toPubkey.toString()}`);
		console.log(`   Amount: ${transferAmount / LAMPORTS_PER_SOL} SOL`);
		console.log(`   Fee Payer: ${fromPubkey.toString()}`);
		console.log(`   Signatures: ${signedTx.signatures.length}`);

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

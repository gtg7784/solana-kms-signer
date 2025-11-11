/**
 * Example: Create an AWS KMS ED25519 key for Solana signing
 *
 * This example demonstrates how to:
 * 1. Initialize the KMS client
 * 2. Create an ED25519 key suitable for Solana
 * 3. Configure key policies and tags
 * 4. Retrieve the key ID and ARN
 */

import { KMSClient, CreateKeyCommand } from '@aws-sdk/client-kms';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  // Validate required environment variables
  const region = process.env.AWS_REGION;

  if (!region) {
    console.error('❌ Error: AWS_REGION environment variable is required');
    console.error('Please create a .env file with:');
    console.error('AWS_REGION=your-region');
    console.error('AWS_ACCESS_KEY_ID=your-access-key (if not using IAM role)');
    console.error('AWS_SECRET_ACCESS_KEY=your-secret-key (if not using IAM role)');
    process.exit(1);
  }

  try {
    console.log('🔐 Creating AWS KMS ED25519 Key for Solana...');
    console.log(`   Region: ${region}`);

    // Initialize KMS client
    const kmsClient = new KMSClient({
      region,
      // Credentials will be loaded from environment or IAM role
    });

    // Create the key
    console.log('\n📝 Creating ED25519 key...');
    const createKeyCommand = new CreateKeyCommand({
      KeySpec: 'ECC_NIST_EDWARDS25519',
      KeyUsage: 'SIGN_VERIFY',
      Description: 'ED25519 key for Solana transaction signing',
      Tags: [
        {
          TagKey: 'Purpose',
          TagValue: 'Solana',
        },
        {
          TagKey: 'Algorithm',
          TagValue: 'ED25519',
        },
        {
          TagKey: 'ManagedBy',
          TagValue: 'solana-kms-signer',
        },
      ],
    });

    const response = await kmsClient.send(createKeyCommand);

    // Display results
    if (response.KeyMetadata) {
      console.log('\n✅ Key created successfully!');
      console.log('\n📊 Key Details:');
      console.log(`   Key ID: ${response.KeyMetadata.KeyId}`);
      console.log(`   ARN: ${response.KeyMetadata.Arn}`);
      console.log(`   Key Spec: ${response.KeyMetadata.KeySpec}`);
      console.log(`   Key Usage: ${response.KeyMetadata.KeyUsage}`);
      console.log(`   Key State: ${response.KeyMetadata.KeyState}`);
      console.log(`   Creation Date: ${response.KeyMetadata.CreationDate?.toISOString()}`);

      // Display usage instructions
      console.log('\n💡 Next Steps:');
      console.log('   1. Update your .env file with the Key ID or ARN:');
      console.log(`      AWS_KMS_KEY_ID=${response.KeyMetadata.KeyId}`);
      console.log('      or');
      console.log(`      AWS_KMS_KEY_ID=${response.KeyMetadata.Arn}`);
      console.log('');
      console.log('   2. Configure key policy for your application:');
      console.log('      - Grant kms:GetPublicKey permission');
      console.log('      - Grant kms:Sign permission');
      console.log('      - Consider using IAM roles for EC2/Lambda/ECS');
      console.log('');
      console.log('   3. Test with sign-message example:');
      console.log('      pnpm example:sign-message');

      // Display estimated costs
      console.log('\n💰 Cost Information:');
      console.log('   - Key storage: ~$1/month per key');
      console.log('   - API calls: $0.03 per 10,000 requests');
      console.log('   - No charge for GetPublicKey calls');
      console.log('   - See: https://aws.amazon.com/kms/pricing/');

      // Security reminder
      console.log('\n🔒 Security Reminders:');
      console.log('   - Keys cannot be exported from KMS (by design)');
      console.log('   - Enable CloudTrail for audit logging');
      console.log('   - Use key policies to restrict access');
      console.log('   - Consider key rotation policies');
      console.log('   - Never share key IDs in public repositories');

    } else {
      console.error('❌ Error: No key metadata in response');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error creating KMS key:', error);
    if (error instanceof Error) {
      console.error('   Details:', error.message);
      if ('cause' in error && error.cause) {
        console.error('   Cause:', error.cause);
      }

      // Common error messages
      if (error.message.includes('AccessDenied')) {
        console.error('\n💡 Tip: Ensure your AWS credentials have kms:CreateKey permission');
      }
      if (error.message.includes('ECC_NIST_EDWARDS25519')) {
        console.error('\n💡 Tip: ED25519 support may not be available in your region yet');
        console.error('   Check AWS KMS documentation for region availability');
      }
    }
    process.exit(1);
  }
}

// Run the example
main().catch(console.error);

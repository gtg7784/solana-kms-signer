/**
 * Configuration for AWS KMS client.
 */
export interface KmsConfig {
	/**
	 * AWS region where the KMS key is located (e.g., 'us-east-1').
	 */
	region: string;

	/**
	 * KMS key ID or ARN to use for signing operations.
	 */
	keyId: string;

	/**
	 * Optional AWS credentials. If not provided, the AWS SDK will use
	 * environment variables, IAM roles, or other credential providers.
	 */
	credentials?: {
		/**
		 * AWS access key ID.
		 */
		accessKeyId: string;

		/**
		 * AWS secret access key.
		 */
		secretAccessKey: string;

		/**
		 * Optional session token for temporary credentials.
		 */
		sessionToken?: string;
	};
}

/**
 * Configuration for Solana KMS Signer.
 * Currently extends KmsConfig with no additional fields.
 * Additional configuration options can be added in the future.
 */
export interface SolanaKmsSignerConfig extends KmsConfig {
	// Additional configuration options can be added here in the future
}

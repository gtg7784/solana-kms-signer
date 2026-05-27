# Contributing to Solana KMS Signer

Thank you for your interest in contributing to Solana KMS Signer! This document provides comprehensive guidelines and instructions for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)
- [Common Tasks](#common-tasks)
- [Getting Help](#getting-help)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors. Please report unacceptable behavior to the project maintainers.

### Our Standards

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js >= 22.13.0
- pnpm 11.x
- AWS Account with KMS access (for integration testing)
- Basic understanding of Solana and AWS KMS
- Git

### Forking and Cloning

1. Fork the repository on GitHub
2. Clone your fork locally:

  ```bash
git clone https://github.com/YOUR_USERNAME/solana-kms-signer.git
cd solana-kms-signer
  ```

3. Add upstream remote:

  ```bash
git remote add upstream https://github.com/gtg7784/solana-kms-signer.git
  ```

## Development Setup

1. Install dependencies:

  ```bash
pnpm install
  ```

2. Build the project:

  ```bash
pnpm build
  ```

3. Run tests:

  ```bash
pnpm test:run
  ```

4. Set up environment variables (for examples):

  ```bash
cp .env.example .env
# Edit .env with your AWS credentials and KMS key ID
  ```

## Development Workflow

### Branch Strategy

- `main` - Production-ready code
- Feature branches - `feat/feature-name`
- Bug fixes - `fix/bug-description`
- Documentation - `docs/what-changed`
- Refactoring - `refactor/what-changed`

### Creating a Feature Branch

  ```bash
git checkout -b feat/your-feature-name
  ```

### Keeping Your Branch Updated

  ```bash
git fetch upstream
git rebase upstream/main
  ```

## Coding Standards

### Linting and Formatting

We use **Biome** for linting and formatting. All code must pass lint checks before being merged.

#### Running Lint Checks

  ```bash
# Check for lint issues
pnpm lint

# Auto-fix lint issues
pnpm lint:fix
  ```

#### Lint Rules

- **No `any` types**: Use proper TypeScript types instead of `any`
- **Template literals**: Use template literals instead of string concatenation
- **Unused variables**: Prefix with underscore if intentionally unused
- **Consistent formatting**: Biome automatically formats code

#### Pre-commit Checklist

Before committing, ensure:

  ```bash
# 1. Lint check passes
pnpm lint

# 2. Tests pass
pnpm test:run

# 3. Type check passes
pnpm type-check

# 4. Build succeeds
pnpm build
  ```

**Note**: CI will automatically run these checks on every push and PR.

### TypeScript Guidelines

- **Type Safety**: Always use explicit types, avoid `any`
- **Strict Mode**: All code must pass TypeScript strict mode
- **ESM**: This project uses ES modules (`"type": "module"`)
- **Use .js extension in imports** (ESM compatibility):

  ```typescript
import { KmsClient } from './client.js';  // ✅
import { KmsClient } from './client';     // ❌
  ```

### Code Style

- Use meaningful variable and function names
- Follow the Single Responsibility Principle
- Keep functions small and focused
- Use async/await for asynchronous operations
- Document with JSDoc:

  ```typescript
/**
 * Signs a Solana transaction using AWS KMS.
 *
 * @param transaction - The transaction to sign
 * @returns Signed transaction
 * @throws {KmsClientError} If KMS operation fails
 */
async signTransaction(transaction: Transaction): Promise<Transaction> {
  // Implementation
}
  ```

### File Organization

  ```
src/
├── kms/              # KMS client and signer implementation
├── utils/            # Utility functions
├── types/            # Type definitions
├── errors/           # Custom error classes
└── index.ts          # Public API exports
  ```

### Naming Conventions

- **Files**: camelCase (e.g., `publicKey.ts`)
- **Classes**: PascalCase (e.g., `SolanaKmsSigner`)
- **Functions**: camelCase (e.g., `signMessage`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `ED25519_PUBLIC_KEY_LENGTH`)
- **Types/Interfaces**: PascalCase (e.g., `KmsConfig`)

### Error Handling

Always use custom error classes with cause chaining:

  ```typescript
try {
  // Operation
} catch (error) {
  throw new KmsClientError('Operation failed', error);
}
  ```



## Testing Guidelines

### Test Structure

We use **Vitest** for testing. All tests should follow the **Given-When-Then** pattern:

  ```typescript
test('should extract public key from DER encoded response', () => {
  // given
  const derPublicKey = Buffer.from('...');

  // when
  const publicKey = extractPublicKeyFromDer(derPublicKey);

  // then
  expect(publicKey).toHaveLength(32);
})
  ```

### Test Coverage Requirements

- **All new features must include tests**
- **Minimum coverage**: 80% overall
- **Critical paths**: 100% coverage (signature generation, DER parsing, public key extraction)
- **Current project coverage**: 97.4%

### Test Categories

1. **Unit Tests**: Test individual functions in isolation
2. **Integration Tests**: Test SolanaKmsSigner with mocked AWS SDK
3. **Failure Cases**: Test error handling and edge cases

### Running Tests

  ```bash
# Run all tests
pnpm test:run

# Run tests in watch mode
pnpm test

# Run tests with UI
pnpm test:ui

# Run with coverage
pnpm test:coverage

# Type check
pnpm type-check
  ```

### Writing Tests

- Place test files next to the code they test (e.g., `signer.ts` → `signer.test.ts`)
- Test both success and failure cases
- Use descriptive test names that explain what is being tested
- Mock external dependencies (AWS KMS SDK)

Example:

  ```typescript
import { describe, test, expect, vi } from 'vitest'
import { SolanaKmsSigner } from './signer'

describe('SolanaKmsSigner', () => {
  describe('success cases', () => {
    test('should sign message successfully', async () => {
      // given
      const signer = new SolanaKmsSigner({
        region: 'us-east-1',
        keyId: 'test-key'
      })

      // when
      const signature = await signer.signMessage(Buffer.from('Hello'))

      // then
      expect(signature).toBeInstanceOf(Uint8Array)
      expect(signature).toHaveLength(64)
    })
  })

  describe('failure cases', () => {
    test('should throw error when KMS is unavailable', async () => {
      // given
      const mockError = new Error('KMS unavailable')
      vi.mocked(KmsClient).mockImplementation(() => {
        throw mockError
      })

      // when & then
      const signer = new SolanaKmsSigner({
        region: 'us-east-1',
        keyId: 'test-key'
      })
      await expect(signer.getPublicKey()).rejects.toThrow('KMS unavailable')
    })
  })
})
  ```

### Integration Tests

For integration tests with real AWS KMS:

1. Set up test KMS key with ED25519
2. Configure `.env` with test credentials
3. Run examples as integration tests:

  ```bash
pnpm example:sign-message
pnpm example:sign-transaction
pnpm example:sign-versioned-transaction
pnpm example:multiple-signatures
  ```

## Pull Request Process

### Before Submitting

1. **Update your branch**:

  ```bash
git fetch upstream
git rebase upstream/main
  ```

2. **Run all checks**:

  ```bash
# Lint check
pnpm lint

# Run tests
pnpm test:run

# Type check
pnpm type-check

# Build
pnpm build
  ```

3. **Commit your changes** with conventional commits:

  ```bash
git commit -m "feat: add support for versioned transactions"
git commit -m "fix: handle edge case in DER parsing"
git commit -m "docs: update README with new examples"
  ```

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

  ```
<type>(<scope>): <subject>

<body>

<footer>
  ```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

**Examples:**

  ```
feat(signer): add support for versioned transaction signing

Implements signVersionedTransaction method for v0 transactions.

Closes #123
  ```

  ```
fix(utils): handle leading zero bytes in DER parsing

DER encoded public keys with leading zeros were incorrectly parsed.
This fix properly calculates the BIT STRING position.

Fixes #456
  ```

### Submitting a Pull Request

1. Push your branch to your fork:

  ```bash
git push origin feat/your-feature-name
  ```

2. Open a Pull Request on GitHub

3. Fill out the PR template with:
   - **Description**: What does this PR do?
   - **Motivation**: Why is this change needed?
   - **Testing**: How was this tested?
   - **Breaking Changes**: Any breaking changes?
   - **Related Issues**: Link to related issues

4. Wait for CI checks to pass

5. Request review from maintainers

### PR Review Process

- All PRs require at least one approval
- CI must pass (lint check, tests, type checking, build)
- Code must follow project conventions and pass all lint rules
- Documentation must be updated if needed

### Addressing Review Comments

  ```bash
# Make changes based on feedback
git add .
git commit -m "refactor: address review comments"
git push origin feat/your-feature-name
  ```

## Release Process

Releases are automated via GitHub Actions when a new release is created.

### For Maintainers

1. Update version in `package.json`
2. Create a git tag:

  ```bash
git tag v1.1.0
git push origin v1.1.0
  ```

3. Create a GitHub Release with the tag
4. GitHub Actions will automatically:
   - Run all tests
   - Build the package
   - Publish to npm with provenance

## Common Tasks

### Adding a New Feature

1. Create a feature branch
2. Implement the feature with tests
3. Update documentation (README, inline comments)
4. Submit a PR

### Fixing a Bug

1. Create a bug fix branch
2. Write a failing test that reproduces the bug
3. Fix the bug
4. Ensure the test passes
5. Submit a PR with the fix

### Updating Dependencies

  ```bash
pnpm update
pnpm test:run
  ```

## Project Structure

  ```
solana-kms-signer/
├── .github/
│   └── workflows/        # CI/CD workflows
├── dist/                 # Build output (gitignored)
├── examples/             # Usage examples
│   ├── sign-message.ts
│   ├── sign-transaction.ts
│   ├── sign-versioned-transaction.ts
│   └── multiple-signatures.ts
├── src/
│   ├── kms/              # KMS implementation
│   │   ├── client.ts
│   │   ├── client.test.ts
│   │   ├── signer.ts
│   │   └── signer.test.ts
│   ├── utils/            # Utilities
│   │   ├── publicKey.ts
│   │   └── publicKey.test.ts
│   ├── errors/           # Error definitions
│   │   ├── index.ts
│   │   └── index.test.ts
│   ├── types/            # Type definitions
│   │   └── index.ts
│   └── index.ts          # Public exports
├── .env.example          # Environment template
├── biome.json            # Linter configuration
├── CONTRIBUTING.md       # This file
├── LICENSE               # MIT License
├── README.md             # Project documentation
├── package.json          # Package configuration
├── tsconfig.json         # TypeScript configuration
└── vitest.config.ts      # Test configuration
  ```

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/gtg7784/solana-kms-signer/issues)
- **Discussions**: [GitHub Discussions](https://github.com/gtg7784/solana-kms-signer/discussions)

## Resources

- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)
- [AWS KMS Documentation](https://docs.aws.amazon.com/kms/)
- [ED25519 Specification](https://ed25519.cr.yp.to/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev/)

## License

By contributing to Solana KMS Signer, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing! Your efforts help make secure Solana transaction signing accessible to everyone.** 🚀
# Contributing to Solana KMS Signer

First off, thank you for considering contributing to Solana KMS Signer! It's people like you that make this tool better for everyone. 🙏

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Development Process](#development-process)
- [Style Guides](#style-guides)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

### Our Standards

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js >= 16.0.0
- pnpm (recommended) or npm/yarn
- AWS Account with KMS access (for integration testing)
- Basic understanding of Solana and AWS KMS

### Quick Start

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/yourusername/solana-kms-signer.git
   cd solana-kms-signer
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Create a feature branch:
   ```bash
   git checkout -b feature/amazing-feature
   ```

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

**Bug Report Template:**
```markdown
### Description
A clear and concise description of the bug.

### Steps to Reproduce
1. Initialize signer with '...'
2. Call method '...'
3. See error

### Expected Behavior
What you expected to happen.

### Actual Behavior
What actually happened.

### Environment
- Node.js version:
- Package version:
- AWS Region:
- OS:

### Additional Context
Any other context, logs, or screenshots.
```

### Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:

- **Use case**: Why is this enhancement needed?
- **Current behavior**: What happens now?
- **Desired behavior**: What should happen instead?
- **Possible implementation**: If you have ideas on how to implement it

### Your First Code Contribution

Unsure where to begin? Look for these labels in our issues:

- `good first issue` - Simple issues perfect for beginners
- `help wanted` - Issues where we need community help
- `documentation` - Documentation improvements

## Development Setup

### Environment Setup

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Configure your AWS credentials:
   ```bash
   # .env file
   AWS_REGION=us-east-1
   AWS_KMS_KEY_ID=your-key-id
   ```

3. Create a test KMS key (optional):
   ```bash
   pnpm example:create-kms-key
   ```

### Building

```bash
# Build TypeScript
pnpm build

# Type checking
pnpm type-check
```

## Development Process

### 1. Branch Naming

Use descriptive branch names:
- `feature/add-batch-signing` - New features
- `fix/signature-verification` - Bug fixes
- `docs/update-api-reference` - Documentation
- `refactor/optimize-caching` - Code refactoring
- `test/add-edge-cases` - Test improvements

### 2. Development Workflow

1. **Write tests first** (TDD approach recommended):
   ```bash
   pnpm test --watch
   ```

2. **Implement your changes**:
   - Follow existing code patterns
   - Maintain backward compatibility
   - Add JSDoc comments for public APIs

3. **Run tests**:
   ```bash
   pnpm test:run
   ```

4. **Check types**:
   ```bash
   pnpm type-check
   ```

5. **Verify coverage**:
   ```bash
   pnpm test:coverage
   ```
   - Aim for >95% coverage for new code
   - Current project coverage: 97.4%

## Style Guides

### TypeScript Style Guide

We follow strict TypeScript conventions:

```typescript
// ✅ Good: Explicit types, clear naming
export interface KmsConfig {
  region: string;
  keyId: string;
  credentials?: AwsCredentials;
}

// ❌ Bad: Implicit any, unclear naming
export interface Config {
  r: any;
  k: any;
  c?: any;
}
```

### Key Principles

1. **Use explicit types** - No implicit `any`
2. **Prefer interfaces over types** for object shapes
3. **Use readonly** where applicable
4. **Document with JSDoc**:
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

5. **Use .js extension in imports** (ESM compatibility):
   ```typescript
   import { KmsClient } from './client.js';  // ✅
   import { KmsClient } from './client';     // ❌
   ```

### Error Handling

Always use custom error classes with cause chaining:

```typescript
try {
  // Operation
} catch (error) {
  throw new KmsClientError('Operation failed', error);
}
```

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

### Examples
```bash
# Feature
feat: add support for batch transaction signing

# Bug fix
fix: handle null response from KMS GetPublicKey

# Documentation
docs: update README with troubleshooting section

# Tests
test: add edge cases for DER parsing

# Breaking change
feat!: change signMessage to return Buffer instead of Uint8Array

BREAKING CHANGE: signMessage now returns Buffer for consistency
```

## Pull Request Process

### Before Submitting

1. **Update tests** - Add tests for new functionality
2. **Update documentation** - Keep README and JSDoc current
3. **Run all checks**:
   ```bash
   pnpm test:run
   pnpm type-check
   pnpm build
   ```
4. **Update CHANGELOG** (if applicable)

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change)
- [ ] New feature (non-breaking change)
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] All tests pass
- [ ] Added new tests
- [ ] Coverage maintained/improved

## Checklist
- [ ] My code follows the project style
- [ ] I've added JSDoc comments
- [ ] I've updated the README (if needed)
- [ ] I've added tests
- [ ] All tests pass locally
```

### Review Process

1. **Automated checks** - CI runs tests and type checking
2. **Code review** - Maintainer reviews code
3. **Feedback** - Address any requested changes
4. **Merge** - Once approved, we'll merge your PR!

## Testing

### Test Structure

```typescript
describe('KmsClient', () => {
  describe('Happy Path', () => {
    it('should sign message successfully', async () => {
      // given
      const message = Buffer.from('test');

      // when
      const signature = await client.sign(message);

      // then
      expect(signature).toHaveLength(64);
    });
  });

  describe('Failure Paths', () => {
    it('should handle KMS errors', async () => {
      // Test error scenarios
    });
  });
});
```

### Running Tests

```bash
# Run all tests
pnpm test:run

# Run with watch mode
pnpm test

# Run with UI
pnpm test:ui

# Coverage report
pnpm test:coverage

# Specific file
pnpm test src/kms/client.test.ts
```

### Integration Tests

For integration tests with real AWS KMS:

1. Set up test KMS key
2. Configure `.env` with test credentials
3. Run examples as integration tests:
   ```bash
   pnpm example:sign-message
   pnpm example:sign-transaction
   ```

## Documentation

### Code Documentation

- All public APIs must have JSDoc comments
- Include `@example` sections where helpful
- Document all parameters with `@param`
- Document return values with `@returns`
- Document exceptions with `@throws`

### README Updates

Update README.md when:
- Adding new features
- Changing API
- Adding configuration options
- Improving examples

### Example Code

When adding features, consider adding an example:

```typescript
// examples/your-feature.ts
import { SolanaKmsSigner } from '../src/index.js';

async function demonstrateFeature() {
  // Show how to use the new feature
}
```

## Community

### Getting Help

- 📖 Read the [documentation](README.md)
- 🔍 Search [existing issues](https://github.com/gtg7784/solana-kms-signer/issues)
- 💬 Start a [discussion](https://github.com/gtg7784/solana-kms-signer/discussions)
- 🐛 Report a [bug](https://github.com/gtg7784/solana-kms-signer/issues/new)

### Credits

Contributors will be recognized in:
- The README.md contributors section
- Release notes
- GitHub contributors page

## Release Process (Maintainers)

1. Update version in package.json
2. Update CHANGELOG.md
3. Run tests and build
4. Create git tag
5. Push to GitHub
6. Publish to npm
7. Create GitHub release

## Questions?

Feel free to:
- Open an issue for questions
- Start a discussion
- Reach out to maintainers

Thank you for contributing! 🚀

---

**Remember**: The best contribution is the one that helps others. Whether it's code, documentation, or helping someone in discussions - every contribution matters!
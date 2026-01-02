# Contributing to llm-search

Thank you for your interest in contributing to llm-search! This document provides guidelines and instructions for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://gitlab.com/m1noa/llm-search.git`
3. Install dependencies: `npm install`

## Development Guidelines

### 1. Check the Todo List

- If you wanna contribute but dont know what to do look at [todo.md](./todo.md)
- Feel free to suggest new items for the todo list

### 2. Writing Code

- Write clean, maintainable TypeScript code
- Follow existing code style and patterns
- Add type definitions for new features
- Keep functions focused and modular

### 3. Documentation

When adding new features or making changes:

- Update relevant docs in the `/docs` directory
- Add examples demonstrating usage
- Document function parameters and return types
- Update README.md if adding major features or new dependencies

### 4. Testing

All new features must include tests:

1. Add a new test file (e.g., `src/modules/myfeature.test.ts`) or add to existing test files
2. Include relevant test files in `/test/files` if needed (like for parsing)
3. Test error handling and edge cases
4. Run tests before submitting: `npm test`
5. Test with different Node.js versions if making platform-specific changes

### 5. Pull Requests

When submitting a PR:

1. Describe the changes
2. Ensure all tests pass

## Common Tasks

### Adding a New File Format

1. Add file type to `FileType` type
2. Create parsing function in `parser.ts`
3. Add test file in `/test/files`
4. Add test case in the corresponding test file
5. Update documentation
6. Update README supported formats

### Adding a Search Provider

1. Add provider to search module
2. Implement rate limiting
3. Add error handling
4. Add fallback behavior
5. Add tests
6. Update documentation

## Need Help?

- Check existing issues and pull requests
- Create an issue for discussion
- Ask questions in pull requests
- Join project discussions

Thank you so much for contributing!!

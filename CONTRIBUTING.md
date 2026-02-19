# Contributing to Vision-Forge

First off, thank you for considering contributing to Vision-Forge! It's people like you that make it an elite tool for the CV community.

## 🛠 Development Workflow

1.  **Fork the repo** and create your branch from `develop`.
2.  **Set up the environment**:
    ```bash
    # Root
    ./scripts/setup.sh
    ```
3.  **Code Style**:
    - Python: Follow PEP 8 (use `black` and `isort`).
    - TypeScript: Use Prettier and follow the project's ESLint config.
4.  **Tests**: Ensure all tests pass before submitting.
    ```bash
    pytest apps/api
    npm run test -w apps/portal
    ```

## 📝 Commit Message Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/).

- `feat:` for new features.
- `fix:` for bug fixes.
- `docs:` for documentation updates.
- `chore:` for maintenance.

Example: `feat(api): add multi-gpu orchestration support`

## 🚀 Pull Request Process

1.  Update the `CHANGELOG.md` with your changes.
2.  The PR must pass all CI/CD checks (Lint, Build, Test).
3.  Get at least one approval from the core maintainers.

## ⚖️ Code of Conduct

Help us maintain a high-trust, elite engineering culture. Please read our [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

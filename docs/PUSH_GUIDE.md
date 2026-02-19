# Execution Guide: Repository Push & Release

Follow these steps to push your productionized repository to GitHub.

## Step 1: Initialize Git
```bash
git init

# Select the target repository
git remote add origin https://github.com/thriniiiiiiiiiiii/Vision-Forge.git
# OR
git remote add origin https://github.com/Pal-Priyanka/Vision-Forge.git
```

## Step 2: Stage and Commit
```bash
# Force stage all files including the new structure
git add .

# Create the elite baseline commit
git commit -m "feat: initial production-grade monarch architecture release"
```

## Step 3: Push to Main
```bash
# Push the branch
git push -u origin main
```

## Step 4: Tag the Release
```bash
# Mark this as version 1.0.0
git tag -a v1.0.0 -m "Release v1.0.0: Initial Productionalization"
git push origin v1.0.0
```

## Troubleshooting: 403 Forbidden / Permission Denied

If you see `Permission to ... denied to ...`, it means your local Git is using the wrong credentials or lacks write access.

### Option 1: Use a Personal Access Token (Recommended)
1. Go to **GitHub Settings** > **Developer Settings** > **Personal Access Tokens** > **Tokens (classic)**.
2. Generate a new token with `repo` scope.
3. Run this command to include your token in the URL:
   ```bash
   git remote set-url origin https://<YOUR_USERNAME>:<YOUR_TOKEN>@github.com/Pal-Priyanka/Vision-Forge.git
   git push -u origin main -f
   ```

### Option 2: Force Authentication Prompt
Reset the URL to force Git to ask for your username/password again:
```bash
git remote set-url origin https://github.com/Pal-Priyanka/Vision-Forge.git
git push origin main
```

### Option 3: Verify Repository Ownership
Ensure `thriniiiiiiiiiiii` is your correct GitHub username. If your username is different (e.g., `Pal-Priyanka`), update the remote URL:
```bash
git remote set-url origin https://github.com/Pal-Priyanka/Vision-Forge.git
git push -u origin main -f
```

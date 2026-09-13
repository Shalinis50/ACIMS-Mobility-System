# ACMIS — Git Workflow & Branching Guidelines

## 1. Branch Hierarchy

The ACMIS project enforces a strict hierarchical branching strategy to ensure code quality, isolated feature development, and reliable release stability:

```text
main (Protected / Stable Production Releases)
  └── development (Shared Integration Branch)
        ├── shalini (Developer Branch)
        ├── brinda (Developer Branch)
        └── developer3 (Developer Branch)
```

---

## 2. Branch Roles & Rules

| Branch | Role | Direct Commits Allowed? | Merging Rules |
| :--- | :--- | :--- | :--- |
| **`main`** | Production / Stable release | ❌ **Strictly NO** | Only receives PRs from `development` after release testing. |
| **`development`** | Shared integration branch | ❌ **NO** (except merge commits) | Feature branches merge into `development` via GitHub Pull Requests. |
| **`shalini`** | Shalini's active workspace | ✅ **YES** | Work on ETA + Delay Prediction & Queue System. |
| **`brinda`** | Brinda's active workspace | ✅ **YES** | Work on Live Tracking & Smart Travel Recommendation. |
| **`developer3`** | Developer 3's workspace | ✅ **YES** | Work on assigned modules. |

### Core Rules:
1. **Never commit directly to `main`.**
2. **Never merge developer branches into each other locally.** All integration must happen via `development`.
3. **Do not merge developer branches automatically.** Every merge into `development` must go through a reviewed GitHub Pull Request.
4. **Pull latest integration work daily** before writing new code.

---

## 3. End-to-End Git Lifecycle

```text
       main (Stable release)
        ↓
   development (Integration base)
        ↓
developer branches (shalini / brinda / developer3)
        ↓
   Pull Request (Peer review & CI)
        ↓
   development (Integrated & Tested)
        ↓
tested stable version
        ↓
       main (Release tag)
```

---

## 4. Daily Developer Routine

### Step 1: Sync with Latest `development`
Before writing any code for the day:
```bash
# Fetch latest references from GitHub
git fetch origin

# Update your local development branch
git checkout development
git pull origin development

# Switch back to your developer branch
git checkout shalini # or brinda / developer3

# Integrate latest development changes into your branch
git merge development
```

### Step 2: Make Changes and Commit Locally
Follow standard conventional commit messages:
- `feat(<module>): description` for new features
- `fix(<module>): description` for bug fixes
- `docs(<module>): description` for documentation changes
- `chore(<module>): description` for routine tasks

```bash
# Check modified files
git status

# Stage specific changes
git add path/to/changed/files

# Commit with a meaningful message
git commit -m "feat(eta): add arrival prediction calculation interface"
```

### Step 3: Push to GitHub
Push your commits to your branch on GitHub:
```bash
git push -u origin shalini # (or brinda / developer3)
```

### Step 4: Open a Pull Request (PR)
When your feature or task milestone is complete:
1. Navigate to GitHub in your browser.
2. Click **New Pull Request**.
3. Set **Base:** `development` and **Compare:** `shalini` (or `brinda` / `developer3`).
4. Title the PR clearly and list completed changes and test verifications.
5. Assign at least one teammate to review the PR.
6. Once approved and checks pass, perform a **Merge Pull Request** into `development`.

---

## 5. Resolving Merge Conflicts

If GitHub reports merge conflicts between your branch and `development`:
1. Check out your developer branch locally:
   ```bash
   git checkout shalini
   ```
2. Pull the latest `development` branch into yours:
   ```bash
   git fetch origin
   git merge origin/development
   ```
3. Open conflicting files and resolve conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`).
4. Stage resolved files and commit:
   ```bash
   git add <resolved-files>
   git commit -m "chore: resolve merge conflicts with development"
   ```
5. Push the resolution to your remote branch:
   ```bash
   git push origin shalini
   ```
   The GitHub PR will automatically update and reflect the resolution.

---

## 6. Promoting Releases to `main`
When `development` reaches a milestone or stable sprint deliverable:
1. Verify all unit, integration, and manual tests pass on `development`.
2. Open a Pull Request from `development` into `main`.
3. Team lead/members conduct a final verification review.
4. Merge the PR into `main`.
5. Optionally tag the release:
   ```bash
   git checkout main
   git pull origin main
   git tag -a v1.0.0 -m "Release v1.0.0 - Initial stable baseline"
   git push origin v1.0.0
   ```

# ACMIS — Automated Campus Mobility Information System

ACMIS is a collaborative campus mobility management platform designed to optimize campus transit, reduce wait times, and provide real-time updates for students, faculty, and campus shuttles.

---

## 👥 Team & Responsibilities

| Developer | Git Branch | Assigned Modules / Responsibilities |
| :--- | :--- | :--- |
| **Shalini** | `shalini` | • ETA + AI Delay Prediction<br>• Queue System |
| **Brinda** | `brinda` | • Live Tracking<br>• Smart Travel Recommendation |
| **Developer 3** | `developer3` | • Reserved for assigned module work |

---

## 🌿 Branching Strategy

Our team uses a structured branching model to maintain stability, prevent merge conflicts, and ensure code quality:

```text
main (Protected / Production-ready Releases)
  └── development (Shared Integration Branch)
        ├── shalini (ETA/Delay Prediction + Queue System)
        ├── brinda (Live Tracking + Smart Travel Recommendation)
        └── developer3 (Assigned Work)
```

- **`main`**: The primary release branch. Contains only tested, stable releases. **Never commit directly to `main`.**
- **`development`**: The shared integration branch where all tested developer feature branches meet.
- **Developer Branches (`shalini`, `brinda`, `developer3`)**: Isolated working branches for each developer. All daily work occurs here.

---

## 🔄 Git Workflow & Lifecycle

The lifecycle of every change follows this progression:

```text
       main
        ↓
   development
        ↓
developer branches (shalini / brinda / developer3)
        ↓
   Pull Request (PR to development)
        ↓
   development (Code Review & Integration)
        ↓
tested stable version
        ↓
       main (Release)
```

---

## 🚀 Developer Guide: How to Work with Git

### 1. Clone the Repository
When getting started on a new machine:
```bash
git clone https://github.com/<organization-or-username>/acmis.git
cd acmis
```

### 2. Check Available Branches and Switch to Your Branch
Fetch all branches from remote and switch to your designated branch:
```bash
# Fetch latest remote branch information
git fetch origin

# Switch to your assigned developer branch
git checkout shalini      # If you are Shalini
# git checkout brinda     # If you are Brinda
# git checkout developer3 # If you are Developer 3
```

### 3. Always Pull Before Starting Work (Daily Routine)
Before starting any coding session, synchronize your branch with the latest changes from `development`:
```bash
# Fetch the latest commits from remote
git fetch origin

# Ensure your local development branch is updated
git checkout development
git pull origin development

# Switch back to your developer branch
git checkout shalini

# Rebase or merge the latest development changes into your branch
git merge development
```

### 4. Work and Commit Locally
Make your modifications, and commit frequently with clear, descriptive commit messages:
```bash
git status
git add <files-you-changed>
git commit -m "feat(queue): implement queue state model"
```

### 5. Push Your Branch to GitHub
Push your work only to your own branch on the remote:
```bash
git push -u origin shalini      # For Shalini
# git push -u origin brinda     # For Brinda
# git push -u origin developer3 # For Developer 3
```

### 6. Merging Changes into `development` via Pull Request (PR)
- Do **NOT** merge directly into `development` or `main` locally.
- Open a **Pull Request** on GitHub:
  - **Base branch:** `development`
  - **Compare branch:** `shalini` (or `brinda` / `developer3`)
- Request a review from at least one team member.
- Once reviewed and CI/tests pass, merge the PR into `development`.

### 7. Releasing to `main`
- When a set of features in `development` is thoroughly tested and deemed stable for release, a PR is opened from `development` into `main`.
- Merging into `main` creates an official stable release version.

---

## 📁 Project Structure

```text
acmis/
├── .env.example          # Template environment variable file
├── .gitignore            # Files and directories excluded from Git tracking
├── README.md             # Project documentation and Git workflow guide
├── backend/              # Backend service foundation (modular services)
├── frontend/             # Frontend application foundation
└── docs/                 # Team specifications and architectural documents
    ├── api-contract.md   # Unified REST API specifications across modules
    ├── architecture.md   # System architecture and module boundaries
    └── git-workflow.md   # In-depth branching and contribution guidelines
```

---

## ⚙️ Initial Environment Setup

1. Duplicate `.env.example` to create your local `.env`:
   ```bash
   cp .env.example .env
   ```
2. Configure local ports and database settings according to your development environment.
3. Verify that your `.env` is ignored by Git (`git status` should not show `.env`).

---

## 📖 Additional Documentation
- [Architecture & Module Boundaries](docs/architecture.md)
- [API Contract & Schema Standards](docs/api-contract.md)
- [Comprehensive Git Workflow Rules](docs/git-workflow.md)

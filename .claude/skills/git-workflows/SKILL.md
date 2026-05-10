---
name: git-workflows
description: Execute git and GitHub operations with Conventional Commits and agent-safe defaults. Use raw git/gh directly. Use gw only for worktree lifecycle (create/finish). Use when making commits, managing branches, working with PRs/issues, or performing any version control operations.
---

# Git & GitHub Workflows

Use raw `git` and `gh` commands directly. `gw` only handles issue-driven worktrees (`gw git worktree create/finish`).

## When to Activate

- Making git commits, pushing, pulling, branching
- Creating or reviewing pull requests
- Working with GitHub issues
- Reviewing git history, diffs, or blame
- Resolving merge conflicts
- Managing worktrees for issue work

## Conventional Commits Format

```
<type>(<optional scope>): <brief description>

<optional body>

<optional footer>
```

### Types

| Type | Purpose | Example |
|------|---------|---------|
| `feat` | New feature | `feat(auth): add OAuth refresh` |
| `fix` | Bug fix | `fix(landing): correct hero sizing` |
| `docs` | Documentation | `docs: update API reference` |
| `refactor` | Code restructure | `refactor(engine): extract validation` |
| `test` | Tests | `test(billing): add webhook tests` |
| `chore` | Maintenance | `chore: update dependencies` |
| `perf` | Performance | `perf(queries): add index for lookups` |

### Scopes

Use package names: `engine`, `landing`, `plant`, `aspen`, `heartwood`, `prism`, `foliage`, `lumen`, `billing`

## Daily Workflow

```bash
# Check state
git status
git diff --stat

# Stage and commit
git add .
git commit -m "feat(engine): add GlassCard hover animation"

# Push
git push

# Create PR
gh pr create --title "feat(engine): add GlassCard hover animation" --body "..."
```

## Read Operations

```bash
git status                       # Working tree status
git diff                         # Unstaged changes
git diff --staged                # Staged changes
git diff main...HEAD             # Changes on this branch vs main
git log --oneline -20            # Recent commits
git log --stat -5                # Commits with file stats
git blame src/lib/file.ts        # Line-by-line authorship
git show abc123                  # Show commit details
```

## Write Operations

```bash
git add .                                    # Stage all
git add src/lib/specific-file.ts             # Stage specific file
git commit -m "feat: add new feature"        # Commit
git push                                     # Push to remote
git push -u origin feature/new-thing         # Push new branch
git pull --rebase                            # Pull with rebase
git branch feature/new-thing                 # Create branch
git switch feature/new-thing                 # Switch branches
git stash                                    # Stash changes
git stash pop                                # Pop stash
git restore --staged file.ts                 # Unstage files
```

## Worktrees (via gw)

Issue-driven worktrees are the ONE thing gw adds over raw git:

```bash
# Create worktree for an issue (fetches title, generates branch name)
gw git worktree create 1234 --write

# Finish: commit, push, merge into main, remove worktree
gw git worktree finish --write

# Finish with custom message
gw git worktree finish --write -m "feat: implement dark mode"

# Finish without merging (just commit + push + remove)
gw git worktree finish --write --no-merge

# List worktrees (raw git)
git worktree list
```

## GitHub Operations

```bash
# Issues (via gw for browse TUI, or raw gh)
gw gh issue list                             # TUI browse with skills
gh issue create --title "..." --body "..."   # Create issue
gh issue close 123                           # Close issue

# Pull Requests
gh pr create --title "feat: ..." --body "..."
gh pr list
gh pr view 123
gh pr merge 123

# CI/Workflow runs
gh run list
gh run view 12345
```

## Branching

```bash
# Feature branch workflow
git switch -c feature/user-auth
# ... work ...
git add . && git commit -m "feat(auth): implement JWT"
git push -u origin feature/user-auth
gh pr create

# Branch naming
feature/feature-name     # New features
fix/bug-description      # Bug fixes
refactor/what-changed    # Refactors
```

## Merge Conflicts

```bash
# Identify conflicts
git status                    # Shows conflicted files

# Resolve manually, then:
git add resolved-file.ts
git commit -m "fix: resolve merge conflicts"

# Or accept one side
git checkout --ours file.ts   # Keep current branch version
git checkout --theirs file.ts # Keep incoming version
```

## Undoing

```bash
git restore file.ts                  # Discard working changes
git restore --staged file.ts         # Unstage
git reset --soft HEAD~1              # Undo commit, keep changes staged
git reset HEAD~1                     # Undo commit, keep changes unstaged
git revert abc123                    # Create new commit undoing a change
```

## Best Practices

**DO:**
- One logical change per commit
- Descriptive subject line under 50 chars
- Use imperative mood ("Add" not "Added")
- Reference issues in footer (`Fixes #123`)
- Use worktrees for parallel issue work

**DON'T:**
- Don't force-push to main/master
- Don't commit secrets, .env files, or API keys
- Don't combine unrelated changes in one commit
- Don't use vague messages ("fix stuff", "update")

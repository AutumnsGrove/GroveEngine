package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	gwexec "github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

const pushTimeout = 5 * time.Minute

func pushOutput(r *gwexec.Result) string {
	if s := strings.TrimSpace(r.Stderr); s != "" {
		return s
	}
	return strings.TrimSpace(r.Stdout)
}

type worktreeInfo struct {
	Path   string `json:"path"`
	Head   string `json:"head"`
	Branch string `json:"branch"`
	Bare   bool   `json:"bare"`
}

func parseWorktreeListPorcelain(output string) []worktreeInfo {
	var trees []worktreeInfo
	var current *worktreeInfo

	for _, line := range strings.Split(output, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			if current != nil {
				trees = append(trees, *current)
				current = nil
			}
			continue
		}
		if strings.HasPrefix(line, "worktree ") {
			current = &worktreeInfo{Path: strings.TrimPrefix(line, "worktree ")}
		} else if current != nil {
			if strings.HasPrefix(line, "HEAD ") {
				current.Head = strings.TrimPrefix(line, "HEAD ")
			} else if strings.HasPrefix(line, "branch ") {
				branch := strings.TrimPrefix(line, "branch ")
				current.Branch = strings.TrimPrefix(branch, "refs/heads/")
			} else if line == "bare" {
				current.Bare = true
			}
		}
	}
	if current != nil {
		trees = append(trees, *current)
	}
	return trees
}

func resolveWorktreeByIssue(number string) (*worktreeInfo, error) {
	output, err := gwexec.GitOutput("worktree", "list", "--porcelain")
	if err != nil {
		return nil, fmt.Errorf("failed to list worktrees: %w", err)
	}
	trees := parseWorktreeListPorcelain(output)

	needle := "issue-" + number + "-"
	var matches []worktreeInfo
	for _, t := range trees {
		if strings.Contains(t.Branch, needle) {
			matches = append(matches, t)
		}
	}

	switch len(matches) {
	case 0:
		return nil, fmt.Errorf("no worktree found for issue #%s", number)
	case 1:
		return &matches[0], nil
	default:
		var paths []string
		for _, m := range matches {
			paths = append(paths, m.Path)
		}
		return nil, fmt.Errorf("multiple worktrees match issue #%s: %s", number, strings.Join(paths, ", "))
	}
}

func slugify(s string, maxLen int) string {
	s = strings.ToLower(s)
	re := regexp.MustCompile(`[^a-z0-9]+`)
	s = re.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if len(s) > maxLen {
		s = s[:maxLen]
		s = strings.TrimRight(s, "-")
	}
	return s
}

func branchNameForIssue(number string, title string, labels []string) string {
	prefix := "feat/"
	for _, l := range labels {
		if strings.EqualFold(l, "bug") {
			prefix = "fix/"
			break
		}
	}
	slug := slugify(title, 50)
	return fmt.Sprintf("%sissue-%s-%s", prefix, number, slug)
}

func repoRoot() (string, error) {
	output, err := gwexec.GitOutput("rev-parse", "--show-toplevel")
	if err != nil {
		return "", fmt.Errorf("not a git repository: %w", err)
	}
	return strings.TrimSpace(output), nil
}

func worktreeBasePath() (string, error) {
	root, err := repoRoot()
	if err != nil {
		cfg := config.Get()
		if _, statErr := os.Stat(filepath.Join(cfg.GroveRoot, ".git")); statErr == nil {
			return filepath.Join(cfg.GroveRoot, ".worktrees"), nil
		}
		return "", err
	}
	return filepath.Join(root, ".worktrees"), nil
}

func worktreePathForIssue(number string) (string, error) {
	base, err := worktreeBasePath()
	if err != nil {
		return "", err
	}
	return filepath.Join(base, "issue-"+number), nil
}

var gitWorktreeCmd = &cobra.Command{
	Use:   "worktree",
	Short: "Git worktree management",
}

var gitWorktreeCreateCmd = &cobra.Command{
	Use:   "create <issue-number>",
	Short: "Create a worktree for an issue",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return fmt.Errorf("not a git repository")
		}
		cfg := config.Get()
		effectiveWrite := cfg.WriteFlag || (cfg.IsInteractive() && !cfg.AgentMode)
		if !effectiveWrite {
			return fmt.Errorf("worktree create requires --write flag")
		}

		number := args[0]
		if err := validateGHNumber(number); err != nil {
			return err
		}

		ghArgs := []string{"issue", "view", number}
		ghArgs = append(ghArgs, ghRepoArgs()...)
		ghArgs = append(ghArgs, "--json", "title,labels")
		issueOutput, err := gwexec.GHOutput(ghArgs...)
		if err != nil {
			return fmt.Errorf("failed to fetch issue #%s: %w", number, err)
		}

		var issueData struct {
			Title  string `json:"title"`
			Labels []struct {
				Name string `json:"name"`
			} `json:"labels"`
		}
		if err := json.Unmarshal([]byte(issueOutput), &issueData); err != nil {
			return fmt.Errorf("failed to parse issue data: %w", err)
		}

		var labelNames []string
		for _, l := range issueData.Labels {
			labelNames = append(labelNames, l.Name)
		}

		branch := branchNameForIssue(number, issueData.Title, labelNames)
		wtPath, err := worktreePathForIssue(number)
		if err != nil {
			return err
		}

		if err := os.MkdirAll(filepath.Dir(wtPath), 0o755); err != nil {
			return fmt.Errorf("failed to create worktree directory: %w", err)
		}

		result, err := gwexec.Git("worktree", "add", "-b", branch, wtPath)
		if err != nil {
			return fmt.Errorf("failed to create worktree: %w", err)
		}
		if !result.OK() {
			return fmt.Errorf("git worktree add: %s", strings.TrimSpace(result.Stderr))
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]string{
				"path":   wtPath,
				"branch": branch,
				"issue":  number,
				"title":  issueData.Title,
			})
			fmt.Println(string(data))
		} else {
			ui.Success(fmt.Sprintf("Created worktree for issue #%s", number))
			ui.PrintKeyValue("path", wtPath)
			ui.PrintKeyValue("branch", branch)
			ui.Hint(fmt.Sprintf("cd %s to start working", wtPath))
		}
		return nil
	},
}

var gitWorktreeFinishCmd = &cobra.Command{
	Use:   "finish [issue-number]",
	Short: "Commit, push, merge into main, and remove worktree",
	Long: `Finish work in the current worktree:
1. Stage and commit all changes (if any)
2. Push the branch to remote
3. Merge branch into main
4. Push main
5. Remove the worktree and clean up branches

When an issue number is provided, resolves the matching worktree by branch
name (e.g. fix/issue-1349-...) and operates on it from any directory.
When omitted, operates on the current working directory.`,
	Args: cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if !gwexec.IsGitRepo() {
			return fmt.Errorf("not a git repository")
		}
		cfg := config.Get()
		effectiveWrite := cfg.WriteFlag || (cfg.IsInteractive() && !cfg.AgentMode)
		if !effectiveWrite {
			return fmt.Errorf("worktree finish requires --write flag")
		}

		message, _ := cmd.Flags().GetString("message")
		deleteBranch, _ := cmd.Flags().GetBool("delete-branch")
		noMerge, _ := cmd.Flags().GetBool("no-merge")

		var cwd string
		var branch string

		if len(args) == 1 {
			number := args[0]
			if err := validateGHNumber(number); err != nil {
				return err
			}
			wt, err := resolveWorktreeByIssue(number)
			if err != nil {
				return err
			}
			cwd = wt.Path
			branch = wt.Branch
		} else {
			var err error
			cwd, err = os.Getwd()
			if err != nil {
				return fmt.Errorf("cannot determine working directory: %w", err)
			}
			branch, err = gwexec.CurrentBranch()
			if err != nil {
				return fmt.Errorf("cannot determine current branch: %w", err)
			}
		}

		if branch == "main" || branch == "master" {
			return fmt.Errorf("cannot finish from main/master branch — must be in a worktree branch")
		}

		listOutput, err := gwexec.GitOutput("worktree", "list", "--porcelain")
		if err != nil {
			return fmt.Errorf("failed to list worktrees: %w", err)
		}
		trees := parseWorktreeListPorcelain(listOutput)
		mainPath := ""
		mainBranch := ""
		for _, t := range trees {
			if t.Branch == "main" || t.Branch == "master" {
				mainPath = t.Path
				mainBranch = t.Branch
				break
			}
		}
		if mainPath == "" {
			return fmt.Errorf("could not find main worktree — remove this worktree manually")
		}

		if !noMerge {
			gwexec.RunInDir(cwd, "git", "fetch", "origin", "--prune")
			rebaseResult, rebaseErr := gwexec.RunInDir(cwd, "git", "rebase", "origin/"+mainBranch)
			if rebaseErr != nil || !rebaseResult.OK() {
				ui.Warning("Could not rebase branch onto origin/" + mainBranch + " — proceeding with current state")
				gwexec.RunInDir(cwd, "git", "rebase", "--abort")
			}
		}

		statusResult, err := gwexec.RunInDir(cwd, "git", "status", "--porcelain")
		if err != nil {
			return fmt.Errorf("git status failed: %w", err)
		}
		hasChanges := strings.TrimSpace(statusResult.Stdout) != ""

		if hasChanges {
			if message == "" {
				message = fmt.Sprintf("feat: work in progress on %s", branch)
			}

			result, err := gwexec.RunInDir(cwd, "git", "add", "-A")
			if err != nil || !result.OK() {
				return fmt.Errorf("git add failed: %w", err)
			}

			diffResult, diffErr := gwexec.RunInDir(cwd, "git", "diff", "--cached", "--diff-filter=D", "--name-only")
			if diffErr == nil {
				deletedFiles := strings.TrimSpace(diffResult.Stdout)
				if deletedFiles != "" {
					deleteCount := len(strings.Split(deletedFiles, "\n"))
					if deleteCount > 50 {
						gwexec.RunInDir(cwd, "git", "reset", "HEAD")
						return fmt.Errorf("safety abort: staging would delete %d files — this likely indicates the branch is out of sync with %s\nRun `git rebase %s` in the worktree first, or use --no-merge to skip", deleteCount, mainBranch, mainBranch)
					}
				}
			}

			result, err = gwexec.RunInDir(cwd, "git", "commit", "-m", message)
			if err != nil || !result.OK() {
				return fmt.Errorf("git commit failed: %s", strings.TrimSpace(result.Stderr))
			}
		}

		pushResult, err := gwexec.RunInDirWithTimeout(pushTimeout, cwd, "git", "push", "-u", "origin", branch)
		if err != nil {
			return fmt.Errorf("git push failed: %w", err)
		}
		if !pushResult.OK() {
			pushResult, err = gwexec.RunInDirWithTimeout(pushTimeout, cwd, "git", "push", "--force-with-lease", "-u", "origin", branch)
			if err != nil {
				return fmt.Errorf("git push failed: %w", err)
			}
			if !pushResult.OK() {
				return fmt.Errorf("git push: %s", pushOutput(pushResult))
			}
		}

		merged := false
		if !noMerge {
			gwexec.RunInDir(mainPath, "git", "fetch", "origin", "--prune")
			rebaseResult, rebaseErr := gwexec.RunInDir(mainPath, "git", "rebase", "origin/"+mainBranch)
			if rebaseErr != nil || !rebaseResult.OK() {
				ui.Warning("Could not rebase " + mainBranch + " onto origin/" + mainBranch + " — merging with current state")
				gwexec.RunInDir(mainPath, "git", "rebase", "--abort")
			}

			mergeResult, mergeErr := gwexec.RunInDir(mainPath, "git", "merge", branch)
			if mergeErr != nil {
				return fmt.Errorf("merge into %s failed: %w — resolve manually in %s", mainBranch, mergeErr, mainPath)
			}
			if !mergeResult.OK() {
				return fmt.Errorf("merge into %s failed: %s\nResolve manually in %s", mainBranch, strings.TrimSpace(mergeResult.Stderr), mainPath)
			}

			pushMainResult, pushMainErr := gwexec.RunInDirWithTimeout(pushTimeout, mainPath, "git", "push")
			if pushMainErr != nil {
				return fmt.Errorf("push %s failed: %w", mainBranch, pushMainErr)
			}
			if !pushMainResult.OK() {
				return fmt.Errorf("push %s failed:\n%s", mainBranch, pushOutput(pushMainResult))
			}
			merged = true
		}

		removeResult, err := gwexec.RunInDir(mainPath, "git", "worktree", "remove", cwd)
		if err != nil || !removeResult.OK() {
			removeResult, err = gwexec.RunInDir(mainPath, "git", "worktree", "remove", "--force", cwd)
			if err != nil {
				return fmt.Errorf("failed to remove worktree: %w", err)
			}
			if !removeResult.OK() {
				return fmt.Errorf("git worktree remove: %s", strings.TrimSpace(removeResult.Stderr))
			}
		}

		gwexec.RunInDir(mainPath, "git", "branch", "-d", branch)

		remoteBranchDeleted := false
		if deleteBranch || merged {
			remoteResult, remoteErr := gwexec.RunInDir(mainPath, "git", "push", "origin", "--delete", branch)
			remoteBranchDeleted = remoteErr == nil && remoteResult.OK()
		}

		if cfg.JSONMode {
			data, _ := json.Marshal(map[string]interface{}{
				"branch":         branch,
				"pushed":         true,
				"merged":         merged,
				"removed":        cwd,
				"main_path":      mainPath,
				"committed":      hasChanges,
				"remote_deleted": remoteBranchDeleted,
			})
			fmt.Println(string(data))
		} else {
			if hasChanges {
				ui.Step(true, "Committed changes")
			}
			ui.Step(true, fmt.Sprintf("Pushed branch %s", branch))
			if merged {
				ui.Step(true, fmt.Sprintf("Merged into %s and pushed", mainBranch))
			}
			ui.Step(true, fmt.Sprintf("Removed worktree %s", cwd))
			if remoteBranchDeleted {
				ui.Step(true, fmt.Sprintf("Deleted remote branch %s", branch))
			}
			ui.Success("Worktree finished")
			ui.Hint(fmt.Sprintf("cd %s", mainPath))
		}
		return nil
	},
}

func init() {
	gitCmd.AddCommand(gitWorktreeCmd)

	gitWorktreeCmd.AddCommand(gitWorktreeCreateCmd)

	gitWorktreeFinishCmd.Flags().StringP("message", "m", "", "Commit message (default: auto-generated)")
	gitWorktreeFinishCmd.Flags().Bool("delete-branch", false, "Delete remote branch after push")
	gitWorktreeFinishCmd.Flags().Bool("no-merge", false, "Skip merging into main (just commit, push, and remove)")
	gitWorktreeCmd.AddCommand(gitWorktreeFinishCmd)
}

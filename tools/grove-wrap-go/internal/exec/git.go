package exec

import (
	"fmt"
	"time"
)

// Git runs a git command and returns the result.
func Git(args ...string) (*Result, error) {
	return Run("git", args...)
}

// GitWithTimeout runs a git command with a custom timeout and returns the result.
// Use this for commands with hooks that may take significantly longer than the
// default 30s (e.g., git push with pre-push hooks that build/typecheck).
func GitWithTimeout(timeout time.Duration, args ...string) (*Result, error) {
	return RunWithTimeout(timeout, "git", args...)
}

// GitStreaming runs a git command with stdout/stderr connected directly to
// the terminal. Use this for long-running git commands (e.g., push with
// pre-push hooks) where the user needs real-time feedback.
func GitStreaming(args ...string) (int, error) {
	return RunStreaming("git", args...)
}

// GitOutput runs a git command and returns stdout, or an error.
func GitOutput(args ...string) (string, error) {
	result, err := Git(args...)
	if err != nil {
		return "", err
	}
	if !result.OK() {
		return "", fmt.Errorf("git %s: %s", args[0], result.Stderr)
	}
	return result.Stdout, nil
}

// IsGitRepo returns true if the current directory is inside a git repository.
func IsGitRepo() bool {
	result, err := Git("rev-parse", "--is-inside-work-tree")
	return err == nil && result.OK()
}

// CurrentBranch returns the current git branch name.
func CurrentBranch() (string, error) {
	result, err := Git("rev-parse", "--abbrev-ref", "HEAD")
	if err != nil {
		return "", err
	}
	if !result.OK() {
		return "", fmt.Errorf("not a git repository")
	}
	lines := result.Lines()
	if len(lines) == 0 {
		return "", fmt.Errorf("could not determine current branch")
	}
	return lines[0], nil
}

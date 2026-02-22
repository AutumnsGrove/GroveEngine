// Package exec provides safe subprocess execution for gw.
//
// All external tool invocations (git, gh, wrangler) go through this package.
// Commands are executed with argument lists (no shell expansion) to prevent
// injection. Output capture and streaming are both supported.
package exec

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"
	"strings"
	"time"
)

// Result holds the output of a completed command.
type Result struct {
	Stdout   string
	Stderr   string
	ExitCode int
}

// OK returns true if the command exited successfully.
func (r *Result) OK() bool {
	return r.ExitCode == 0
}

// Lines returns stdout split into non-empty lines.
func (r *Result) Lines() []string {
	raw := strings.Split(strings.TrimSpace(r.Stdout), "\n")
	lines := make([]string, 0, len(raw))
	for _, l := range raw {
		if l != "" {
			lines = append(lines, l)
		}
	}
	return lines
}

// DefaultTimeout is the maximum time a subprocess can run.
const DefaultTimeout = 30 * time.Second

// Run executes a command and captures its output.
// The command is NOT run through a shell — args are passed directly.
func Run(name string, args ...string) (*Result, error) {
	return RunWithTimeout(DefaultTimeout, name, args...)
}

// RunWithTimeout executes a command with a specific timeout.
func RunWithTimeout(timeout time.Duration, name string, args ...string) (*Result, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	return RunContext(ctx, name, args...)
}

// RunContext executes a command with the given context.
func RunContext(ctx context.Context, name string, args ...string) (*Result, error) {
	cmd := exec.CommandContext(ctx, name, args...)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()

	result := &Result{
		Stdout: stdout.String(),
		Stderr: stderr.String(),
	}

	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			result.ExitCode = exitErr.ExitCode()
			return result, nil
		}
		return result, fmt.Errorf("failed to execute %s: %w", name, err)
	}

	return result, nil
}

// Which checks if a binary exists in PATH.
func Which(name string) (string, bool) {
	path, err := exec.LookPath(name)
	if err != nil {
		return "", false
	}
	return path, true
}

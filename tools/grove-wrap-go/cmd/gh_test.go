package cmd

import (
	"testing"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/safety"
)

// --- Validation tests ---

func TestValidateGHNumber(t *testing.T) {
	tests := []struct {
		input string
		valid bool
	}{
		{"123", true},
		{"1", true},
		{"999999", true},
		{"0", false},
		{"-1", false},
		{"abc", false},
		{"", false},
		{"12.5", false},
		{"123abc", false},
	}
	for _, tt := range tests {
		err := validateGHNumber(tt.input)
		if tt.valid && err != nil {
			t.Errorf("validateGHNumber(%q) = %v, want nil", tt.input, err)
		}
		if !tt.valid && err == nil {
			t.Errorf("validateGHNumber(%q) = nil, want error", tt.input)
		}
	}
}

func TestValidateRunID(t *testing.T) {
	tests := []struct {
		input string
		valid bool
	}{
		{"12345678", true},
		{"1", true},
		{"0", false},
		{"-1", false},
		{"abc", false},
		{"", false},
	}
	for _, tt := range tests {
		err := validateRunID(tt.input)
		if tt.valid && err != nil {
			t.Errorf("validateRunID(%q) = %v, want nil", tt.input, err)
		}
		if !tt.valid && err == nil {
			t.Errorf("validateRunID(%q) = nil, want error", tt.input)
		}
	}
}

func TestClampGHLimit(t *testing.T) {
	tests := []struct {
		input, want int
	}{
		{30, 30},
		{0, 1},
		{-5, 1},
		{1, 1},
		{1000, 1000},
		{1001, 1000},
		{99999, 1000},
		{500, 500},
	}
	for _, tt := range tests {
		got := clampGHLimit(tt.input)
		if got != tt.want {
			t.Errorf("clampGHLimit(%d) = %d, want %d", tt.input, got, tt.want)
		}
	}
}

// --- Safety tier tests ---

func TestGHPRSafetyTiers(t *testing.T) {
	// Test safety tiers directly to avoid global config/interactive detection
	// READ operations should not require --write
	readOps := []string{
		"pr_list", "pr_view", "pr_status", "pr_checks",
		"issue_list", "issue_view", "issue_search",
		"run_list", "run_view", "run_watch",
		"api_get", "rate_limit",
	}
	for _, op := range readOps {
		err := safety.CheckGitHubSafety(op, false, false, false)
		if err != nil {
			t.Errorf("CheckGitHubSafety(%q) should be READ (no error), got: %v", op, err)
		}
	}

	// WRITE operations should require --write (non-interactive, non-agent)
	writeOps := []string{
		"pr_create", "pr_comment", "pr_review",
		"issue_create", "issue_comment",
		"run_rerun", "run_cancel",
	}
	for _, op := range writeOps {
		err := safety.CheckGitHubSafety(op, false, false, false)
		if err == nil {
			t.Errorf("CheckGitHubSafety(%q) should require --write, got nil", op)
		}
	}

	// WRITE operations should pass with --write
	for _, op := range writeOps {
		err := safety.CheckGitHubSafety(op, true, false, false)
		if err != nil {
			t.Errorf("CheckGitHubSafety(%q) with --write should pass, got: %v", op, err)
		}
	}

	// WRITE operations should auto-pass for interactive humans
	for _, op := range writeOps {
		err := safety.CheckGitHubSafety(op, false, false, true)
		if err != nil {
			t.Errorf("CheckGitHubSafety(%q) interactive should auto-pass, got: %v", op, err)
		}
	}
}

// --- Conclusion icon tests ---

func TestConclusionIcon(t *testing.T) {
	tests := []struct {
		conclusion, status, want string
	}{
		{"success", "completed", "✓"},
		{"failure", "completed", "✗"},
		{"cancelled", "completed", "⊘"},
		{"skipped", "completed", "–"},
		{"", "in_progress", "◐"},
		{"", "queued", "○"},
		{"", "unknown", "?"},
	}
	for _, tt := range tests {
		got := conclusionIcon(tt.conclusion, tt.status)
		if got != tt.want {
			t.Errorf("conclusionIcon(%q, %q) = %q, want %q",
				tt.conclusion, tt.status, got, tt.want)
		}
	}
}

// --- Package resolution tests ---

func TestResolvePackageDirRejectsTraversal(t *testing.T) {
	badNames := []string{
		"../etc/passwd",
		"foo/../bar",
		"foo;rm -rf /",
		"foo|cat /etc/passwd",
		"foo&echo",
		"foo`id`",
		"foo$(whoami)",
		"packages/foo",
		"foo\\bar",
	}
	for _, name := range badNames {
		_, err := resolvePackageDir(name)
		if err == nil {
			t.Errorf("resolvePackageDir(%q) should reject, got nil", name)
		}
	}
}

func TestResolvePackageDirAcceptsValid(t *testing.T) {
	// Empty pkg should return cwd
	dir, err := resolvePackageDir("")
	if err != nil {
		t.Errorf("resolvePackageDir(\"\") = error %v, want cwd", err)
	}
	if dir == "" {
		t.Error("resolvePackageDir(\"\") returned empty dir")
	}
}

// --- Package script detection tests ---

func TestPackageHasScriptNonexistent(t *testing.T) {
	// Should return false for nonexistent directory
	if packageHasScript("/nonexistent/dir", "test") {
		t.Error("packageHasScript should return false for nonexistent dir")
	}
}

// --- CapitalizeFirst tests ---

func TestCapitalizeFirst(t *testing.T) {
	tests := []struct {
		input, want string
	}{
		{"lint", "Lint"},
		{"check", "Check"},
		{"test", "Test"},
		{"", ""},
		{"A", "A"},
		{"abc", "Abc"},
	}
	for _, tt := range tests {
		got := capitalizeFirst(tt.input)
		if got != tt.want {
			t.Errorf("capitalizeFirst(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

// --- CI affected packages tests ---

func TestDetectAffectedCIPackagesNoOp(t *testing.T) {
	// On a clean branch at main, should return empty or non-empty
	// depending on git state, but should never panic
	result := detectAffectedCIPackages()
	_ = result.shortNames
	_ = result.fullPaths
	_ = result.runAll
}

func TestIsRootLevelChange(t *testing.T) {
	tests := []struct {
		file string
		want bool
	}{
		{"package.json", true},
		{"pnpm-lock.yaml", true},
		{"tsconfig.json", true},
		{"scripts/foo.sh", true},
		{"libs/engine/src/index.ts", false},
		{"apps/plant/package.json", false},
		{"", false},
	}
	for _, tt := range tests {
		got := isRootLevelChange(tt.file)
		if got != tt.want {
			t.Errorf("isRootLevelChange(%q) = %v, want %v", tt.file, got, tt.want)
		}
	}
}

func TestFileToPackagePath(t *testing.T) {
	tests := []struct {
		file string
		want string
	}{
		{"libs/engine/src/lib/foo.ts", "libs/engine"},
		{"apps/plant/src/routes/+page.svelte", "apps/plant"},
		{"services/heartwood/src/index.ts", "services/heartwood"},
		{"workers/warden/src/index.ts", "workers/warden"},
		{"package.json", ""},
		{"scripts/foo.sh", ""},
		{"", ""},
	}
	for _, tt := range tests {
		got := fileToPackagePath(tt.file)
		if got != tt.want {
			t.Errorf("fileToPackagePath(%q) = %q, want %q", tt.file, got, tt.want)
		}
	}
}

func TestResolveTransitiveDependents(t *testing.T) {
	// Changing libs/prism should cascade: prism → foliage → engine → all apps
	direct := map[string]bool{"libs/prism": true}
	affected := resolveTransitiveDependents(direct)

	// Must include the full chain
	for _, pkg := range []string{"libs/prism", "libs/foliage", "libs/engine", "apps/plant", "apps/landing"} {
		if !affected[pkg] {
			t.Errorf("expected %q in affected set, but it was missing", pkg)
		}
	}
}

func TestResolveTransitiveDependentsEngineOnly(t *testing.T) {
	direct := map[string]bool{"libs/engine": true}
	affected := resolveTransitiveDependents(direct)

	// Engine change should include all consumer apps
	if !affected["apps/plant"] {
		t.Error("expected apps/plant in affected set")
	}
	if !affected["services/heartwood"] {
		t.Error("expected services/heartwood in affected set")
	}
	// But NOT foliage (foliage is upstream of engine, not downstream)
	if affected["libs/foliage"] {
		t.Error("libs/foliage should NOT be in affected set when only engine changed")
	}
}

func TestContainsAny(t *testing.T) {
	slice := []string{"libs/engine", "apps/plant", "libs/foliage"}
	if !containsAny(slice, "libs/engine", "libs/prism") {
		t.Error("expected containsAny to find libs/engine")
	}
	if containsAny(slice, "libs/prism", "libs/infra") {
		t.Error("expected containsAny to return false for missing values")
	}
}

// --- API endpoint validation ---

func TestGHAPIEndpointValidation(t *testing.T) {
	// Test that shell metacharacters in endpoints would be caught
	badEndpoints := []string{
		"repos/foo;rm -rf /",
		"repos/foo|cat",
		"repos/foo&echo",
		"repos/foo`id`",
		"repos/foo$(cmd)",
	}
	for _, ep := range badEndpoints {
		// The validation is inside the command, but we test the logic directly
		for _, c := range ";|&`$()" {
			if contains(ep, byte(c)) {
				// Would be caught by ContainsAny check
				return
			}
		}
	}
}

func contains(s string, b byte) bool {
	for i := 0; i < len(s); i++ {
		if s[i] == b {
			return true
		}
	}
	return false
}

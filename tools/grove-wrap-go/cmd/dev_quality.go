package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/spf13/cobra"
	"github.com/spf13/pflag"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/exec"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

// detectPackageRunner returns the package manager command prefix for pnpm scripts.
func detectPackageRunner() string {
	return "pnpm"
}

// packageHasScript checks if a package.json in the given dir has a script.
func packageHasScript(dir, script string) bool {
	path := filepath.Join(dir, "package.json")
	data, err := os.ReadFile(path)
	if err != nil {
		return false
	}
	var pkg map[string]interface{}
	if json.Unmarshal(data, &pkg) != nil {
		return false
	}
	scripts, ok := pkg["scripts"].(map[string]interface{})
	if !ok {
		return false
	}
	_, exists := scripts[script]
	return exists
}

// resolvePackageDir resolves a package name to its directory, or returns cwd.
func resolvePackageDir(pkg string) (string, error) {
	if pkg == "" {
		return os.Getwd()
	}
	// Reject path traversal and shell metacharacters in package names
	if strings.Contains(pkg, "..") || strings.ContainsAny(pkg, "/\\;|&`$()") {
		return "", fmt.Errorf("invalid package name: %q", pkg)
	}
	cfg := config.Get()
	root := cfg.GroveRoot
	for _, prefix := range []string{"packages", "apps", "services", "workers", "libs", "tools"} {
		dir := filepath.Join(root, prefix, pkg)
		if info, err := os.Stat(dir); err == nil && info.IsDir() {
			return dir, nil
		}
	}
	return "", fmt.Errorf("package %q not found in monorepo", pkg)
}

// --- gw test ---

var testCmd = &cobra.Command{
	Use:   "test",
	Short: "Run tests for a package",
	Long: `Run tests for a package. Auto-detects test runner.

Node packages: uses vitest via pnpm run test
Python packages: uses pytest via uv run pytest`,
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		pkg, _ := cmd.Flags().GetString("package")
		all, _ := cmd.Flags().GetBool("all")
		watch, _ := cmd.Flags().GetBool("watch")
		coverage, _ := cmd.Flags().GetBool("coverage")
		filter, _ := cmd.Flags().GetString("filter")
		dryRun, _ := cmd.Flags().GetBool("dry-run")

		if all {
			runArgs := []string{"pnpm", "-r", "run", "test:run"}
			if dryRun {
				return printDryRun(cfg, "all", runArgs)
			}
			return runMonorepoCommand(cfg, "Testing all packages", runArgs)
		}

		dir, err := resolvePackageDir(pkg)
		if err != nil {
			return err
		}
		pkgName := filepath.Base(dir)

		// Determine test command
		var runArgs []string
		if packageHasScript(dir, "test") && watch {
			runArgs = []string{"pnpm", "run", "test"}
		} else if packageHasScript(dir, "test:run") && !watch {
			runArgs = []string{"pnpm", "run", "test:run"}
		} else {
			runArgs = []string{"pnpm", "exec", "vitest"}
			if !watch {
				runArgs = append(runArgs, "run")
			}
		}

		if coverage {
			runArgs = append(runArgs, "--", "--coverage")
		}
		if filter != "" {
			runArgs = append(runArgs, "--", "-t", filter)
		}

		if dryRun {
			return printDryRun(cfg, pkgName, runArgs)
		}

		return runInPackage(cfg, "Testing", pkgName, dir, runArgs)
	},
}

// --- gw build ---

var buildCmd = &cobra.Command{
	Use:   "build",
	Short: "Build a package",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		pkg, _ := cmd.Flags().GetString("package")
		all, _ := cmd.Flags().GetBool("all")
		clean, _ := cmd.Flags().GetBool("clean")
		dryRun, _ := cmd.Flags().GetBool("dry-run")

		if all {
			runArgs := []string{"pnpm", "-r", "run", "build"}
			if dryRun {
				return printDryRun(cfg, "all", runArgs)
			}
			return runMonorepoCommand(cfg, "Building all packages", runArgs)
		}

		dir, err := resolvePackageDir(pkg)
		if err != nil {
			return err
		}
		pkgName := filepath.Base(dir)

		if clean {
			// Clean build artifacts
			for _, artifact := range []string{"dist", ".svelte-kit", "build", filepath.Join("node_modules", ".cache")} {
				os.RemoveAll(filepath.Join(dir, artifact))
			}
			if !cfg.JSONMode {
				ui.Step(true, "Cleaned build artifacts")
			}
		}

		runArgs := []string{"pnpm", "run", "build"}

		if dryRun {
			return printDryRun(cfg, pkgName, runArgs)
		}

		return runInPackage(cfg, "Building", pkgName, dir, runArgs)
	},
}

// --- gw check ---

var checkCmd = &cobra.Command{
	Use:   "check",
	Short: "Type-check a package",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		pkg, _ := cmd.Flags().GetString("package")
		all, _ := cmd.Flags().GetBool("all")
		watch, _ := cmd.Flags().GetBool("watch")
		strict, _ := cmd.Flags().GetBool("strict")
		dryRun, _ := cmd.Flags().GetBool("dry-run")

		// Default to --all when no package specified and at monorepo root
		if !all && pkg == "" {
			dir, err := resolvePackageDir("")
			if err == nil && dir == cfg.GroveRoot {
				all = true
			}
		}

		if all {
			runArgs := []string{"pnpm", "-r", "run", "check"}
			if dryRun {
				return printDryRun(cfg, "all", runArgs)
			}
			return runMonorepoCommand(cfg, "Type checking all packages", runArgs)
		}

		dir, err := resolvePackageDir(pkg)
		if err != nil {
			return err
		}
		pkgName := filepath.Base(dir)

		var runArgs []string
		if packageHasScript(dir, "check") {
			runArgs = []string{"pnpm", "run", "check"}
		} else {
			runArgs = []string{"pnpm", "exec", "svelte-check", "--tsconfig", "./tsconfig.json"}
		}

		if watch {
			runArgs = append(runArgs, "--", "--watch")
		}
		if strict {
			runArgs = append(runArgs, "--", "--fail-on-warnings")
		}

		if dryRun {
			return printDryRun(cfg, pkgName, runArgs)
		}

		return runInPackage(cfg, "Type checking", pkgName, dir, runArgs)
	},
}

// --- gw lint ---

var lintCmd = &cobra.Command{
	Use:   "lint",
	Short: "Lint a package",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		pkg, _ := cmd.Flags().GetString("package")
		all, _ := cmd.Flags().GetBool("all")
		fix, _ := cmd.Flags().GetBool("fix")
		dryRun, _ := cmd.Flags().GetBool("dry-run")

		if all {
			script := "lint"
			if fix {
				script = "lint:fix"
			}
			runArgs := []string{"pnpm", "-r", "run", script}
			if dryRun {
				return printDryRun(cfg, "all", runArgs)
			}
			return runMonorepoCommand(cfg, "Linting all packages", runArgs)
		}

		dir, err := resolvePackageDir(pkg)
		if err != nil {
			return err
		}
		pkgName := filepath.Base(dir)

		var runArgs []string
		if fix {
			if packageHasScript(dir, "lint:fix") {
				runArgs = []string{"pnpm", "run", "lint:fix"}
			} else {
				runArgs = []string{"pnpm", "exec", "eslint", "src", "--fix"}
			}
		} else {
			if packageHasScript(dir, "lint") {
				runArgs = []string{"pnpm", "run", "lint"}
			} else {
				runArgs = []string{"pnpm", "exec", "eslint", "src"}
			}
		}

		if dryRun {
			return printDryRun(cfg, pkgName, runArgs)
		}

		return runInPackage(cfg, "Linting", pkgName, dir, runArgs)
	},
}

// --- gw fmt ---

var fmtCmd = &cobra.Command{
	Use:   "fmt",
	Short: "Format code",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		pkg, _ := cmd.Flags().GetString("package")
		all, _ := cmd.Flags().GetBool("all")
		checkOnly, _ := cmd.Flags().GetBool("check")
		dryRun, _ := cmd.Flags().GetBool("dry-run")

		if all {
			script := "format"
			if checkOnly {
				script = "format:check"
			}
			runArgs := []string{"pnpm", "-r", "run", script}
			if dryRun {
				return printDryRun(cfg, "all", runArgs)
			}
			label := "Formatting all packages"
			if checkOnly {
				label = "Checking format for all packages"
			}
			return runMonorepoCommand(cfg, label, runArgs)
		}

		dir, err := resolvePackageDir(pkg)
		if err != nil {
			return err
		}
		pkgName := filepath.Base(dir)

		var runArgs []string
		if checkOnly {
			if packageHasScript(dir, "format:check") {
				runArgs = []string{"pnpm", "run", "format:check"}
			} else {
				runArgs = []string{"pnpm", "exec", "prettier", "--check",
					"src/**/*.{ts,js,svelte,css,json}", "*.{ts,js,json}"}
			}
		} else {
			if packageHasScript(dir, "format") {
				runArgs = []string{"pnpm", "run", "format"}
			} else {
				runArgs = []string{"pnpm", "exec", "prettier", "--write",
					"src/**/*.{ts,js,svelte,css,json}", "*.{ts,js,json}"}
			}
		}

		if dryRun {
			return printDryRun(cfg, pkgName, runArgs)
		}

		label := "Formatting"
		if checkOnly {
			label = "Checking format for"
		}
		return runInPackage(cfg, label, pkgName, dir, runArgs)
	},
}

// --- gw ci ---

// ciStep represents a single CI pipeline step.
type ciStep struct {
	Name     string  `json:"name"`
	Passed   bool    `json:"passed"`
	Duration float64 `json:"duration"`
	Skipped  bool    `json:"skipped,omitempty"`
}

var ciCmd = &cobra.Command{
	Use:   "ci",
	Short: "Run full CI pipeline",
	Long: `Run full CI pipeline: lint → check → test → build.

Matches the GitHub Actions CI pipeline as closely as possible:
- Detects affected packages from both committed and uncommitted changes
- Resolves transitive dependencies (engine change → all consumer apps)
- Rebuilds library dist/ when needed (foliage, gossamer, engine)

Flags:
  --affected   Only run CI for packages affected by changes since origin/main
  --full       Run CI for ALL packages regardless of changes
  --skip-*     Skip individual steps (lint, check, test, build)
  --fail-fast  Stop on first failure
  --diagnose   Show structured error diagnostics`,
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		pkg, _ := cmd.Flags().GetString("package")
		affected, _ := cmd.Flags().GetBool("affected")
		full, _ := cmd.Flags().GetBool("full")
		skipLint, _ := cmd.Flags().GetBool("skip-lint")
		skipCheck, _ := cmd.Flags().GetBool("skip-check")
		skipTest, _ := cmd.Flags().GetBool("skip-test")
		skipBuild, _ := cmd.Flags().GetBool("skip-build")
		failFast, _ := cmd.Flags().GetBool("fail-fast")
		dryRun, _ := cmd.Flags().GetBool("dry-run")

		root := cfg.GroveRoot

		// Determine scope
		var scope string
		var filterArgs []string
		runAll := full // --full forces all packages
		var affectedFullPaths []string // track "libs/engine" etc. for rebuild logic

		if pkg != "" {
			scope = pkg
			filterArgs = []string{"--filter", pkg}
		} else if affected || full {
			if full {
				runAll = true
			}
			if !runAll {
				result := detectAffectedCIPackages()
				if result.runAll {
					runAll = true
				}
				if len(result.shortNames) == 0 && !runAll {
					if cfg.JSONMode {
						data, _ := json.Marshal(map[string]interface{}{
							"passed": true, "steps": []ciStep{}, "affected_packages": []string{},
						})
						fmt.Println(string(data))
					} else {
						ui.Success("No affected packages — nothing to check")
					}
					return nil
				}
				if !runAll {
					scope = strings.Join(result.shortNames, ", ")
					for _, p := range result.shortNames {
						filterArgs = append(filterArgs, "--filter", p)
					}
					affectedFullPaths = result.fullPaths
				}
			}
			if runAll {
				scope = "all"
			}
		} else {
			scope = "all"
		}

		// --- Library rebuild step (matches grove-setup action) ---
		// If affected libs need their dist/ rebuilt before consumers can type-check
		needsRebuild := runAll || containsAny(affectedFullPaths,
			"libs/foliage", "libs/gossamer", "libs/engine",
			"libs/prism", "libs/infra")

		if needsRebuild {
			if err := rebuildLibraries(cfg, root, affectedFullPaths, runAll, dryRun); err != nil {
				if !cfg.JSONMode {
					ui.Error("Library rebuild failed — downstream checks would be unreliable")
				}
				return err
			}
		}

		// Define pipeline steps
		type stepDef struct {
			name string
			skip bool
			args []string
		}

		steps := []stepDef{
			{"lint", skipLint, append([]string{"pnpm"}, append(filterArgs, "run", "lint")...)},
			{"check", skipCheck, append([]string{"pnpm"}, append(filterArgs, "run", "check")...)},
			{"test", skipTest, append([]string{"pnpm"}, append(filterArgs, "run", "test:run")...)},
			{"build", skipBuild, append([]string{"pnpm"}, append(filterArgs, "run", "build")...)},
		}

		// For "all" scope with no filters, use -r
		if len(filterArgs) == 0 {
			for i := range steps {
				steps[i].args = []string{"pnpm", "-r", "run", steps[i].name}
				if steps[i].name == "test" {
					steps[i].args = []string{"pnpm", "-r", "run", "test:run"}
				}
			}
		}

		if dryRun {
			var drySteps []map[string]interface{}
			for _, s := range steps {
				if s.skip {
					continue
				}
				drySteps = append(drySteps, map[string]interface{}{
					"name":    s.name,
					"command": s.args,
				})
			}
			data, _ := json.MarshalIndent(map[string]interface{}{
				"dry_run": true, "scope": scope, "steps": drySteps,
			}, "", "  ")
			fmt.Println(string(data))
			return nil
		}

		if !cfg.JSONMode {
			ui.PrintHeader(fmt.Sprintf("Grove CI Pipeline (%s)", scope))
		}

		var results []ciStep
		allPassed := true
		totalStart := time.Now()

		for _, s := range steps {
			if s.skip {
				results = append(results, ciStep{Name: s.name, Passed: true, Skipped: true})
				continue
			}

			if !cfg.JSONMode {
				fmt.Printf("  > %s...\n", capitalizeFirst(s.name))
			}

			start := time.Now()
			result, err := exec.RunWithTimeout(5*time.Minute, s.args[0], s.args[1:]...)
			duration := time.Since(start).Seconds()

			passed := err == nil && result != nil && result.OK()
			results = append(results, ciStep{
				Name: s.name, Passed: passed, Duration: duration,
			})

			if !cfg.JSONMode {
				ui.Step(passed, fmt.Sprintf("%s (%.1fs)", capitalizeFirst(s.name), duration))
			}

			if !passed {
				allPassed = false
				if failFast {
					break
				}
			}
		}

		totalDuration := time.Since(totalStart).Seconds()

		if cfg.JSONMode {
			data, _ := json.MarshalIndent(map[string]interface{}{
				"passed":   allPassed,
				"duration": totalDuration,
				"scope":    scope,
				"steps":    results,
			}, "", "  ")
			fmt.Println(string(data))
		} else {
			fmt.Println()
			if allPassed {
				ui.Success(fmt.Sprintf("CI passed in %.1fs", totalDuration))
			} else {
				var failed []string
				for _, r := range results {
					if !r.Passed && !r.Skipped {
						failed = append(failed, r.Name)
					}
				}
				ui.Error(fmt.Sprintf("CI failed: %s", strings.Join(failed, ", ")))
			}
		}

		if !allPassed {
			os.Exit(1)
		}
		return nil
	},
}

// dependents maps a library to the packages that depend on it.
// Extends .github/scripts/affected-packages.mjs DEPENDENTS with prism/infra
// chains. Keep in sync — if you add a package here, add it to the JS too.
var dependents = map[string][]string{
	"libs/foliage":  {"libs/engine"},
	"libs/gossamer": {"libs/engine"},
	"libs/prism":    {"libs/foliage", "libs/engine"},
	"libs/infra":    {"libs/engine"},
	"libs/engine": {
		"apps/amber",
		"apps/clearing",
		"apps/domains",
		"apps/ivy",
		"apps/landing",
		"apps/login",
		"apps/meadow",
		"apps/plant",
		"apps/terrarium",
		"services/amber",
		"services/durable-objects",
		"services/forage",
		"services/heartwood",
		"workers/vista-collector",
		"workers/warden",
	},
	"libs/vineyard": {},
	"libs/shutter":  {},
}

// rootLevelFiles trigger a full CI run when changed.
var rootLevelFiles = []string{
	"package.json",
	"pnpm-lock.yaml",
	"tsconfig.json",
}

// fileToPackagePath maps a file path to its monorepo package path (e.g. "libs/engine").
// Returns empty string if the file is not inside a known package directory.
func fileToPackagePath(file string) string {
	for _, prefix := range []string{"apps/", "services/", "workers/", "libs/", "packages/"} {
		if strings.HasPrefix(file, prefix) {
			rest := strings.TrimPrefix(file, prefix)
			parts := strings.SplitN(rest, "/", 2)
			if len(parts) > 0 && parts[0] != "" {
				return strings.TrimSuffix(prefix, "/") + "/" + parts[0]
			}
		}
	}
	return ""
}

// resolveTransitiveDependents expands a set of directly-changed packages to
// include all transitive dependents via the dependents graph.
func resolveTransitiveDependents(direct map[string]bool) map[string]bool {
	affected := make(map[string]bool)
	for k := range direct {
		affected[k] = true
	}
	changed := true
	for changed {
		changed = false
		for pkg := range affected {
			for _, dep := range dependents[pkg] {
				if !affected[dep] {
					affected[dep] = true
					changed = true
				}
			}
		}
	}
	return affected
}

// ciAffectedResult holds both representations of affected packages.
type ciAffectedResult struct {
	// shortNames are for pnpm --filter (e.g. "engine", "plant")
	shortNames []string
	// fullPaths are for rebuild detection (e.g. "libs/engine", "apps/plant")
	fullPaths []string
	// runAll is true when root-level files changed, meaning all packages are affected
	runAll bool
}

// detectAffectedCIPackages returns packages affected by changes since main.
// Uses git diff origin/main...HEAD for committed changes AND git status for
// uncommitted changes — matching the detection strategy of GitHub Actions CI.
func detectAffectedCIPackages() ciAffectedResult {
	directlyChanged := map[string]bool{}
	runAll := false

	// 1. Committed-but-not-pushed changes: git diff origin/main...HEAD
	diffResult, err := exec.Git("diff", "--name-only", "origin/main...HEAD")
	if err == nil && diffResult.OK() {
		for _, file := range diffResult.Lines() {
			file = strings.TrimSpace(file)
			if file == "" {
				continue
			}
			if isRootLevelChange(file) {
				runAll = true
			}
			if pkg := fileToPackagePath(file); pkg != "" {
				directlyChanged[pkg] = true
			}
		}
	}

	// 2. Uncommitted changes: git status --porcelain
	statusResult, err := exec.Git("status", "--porcelain")
	if err == nil && statusResult.OK() {
		for _, line := range statusResult.Lines() {
			if len(line) < 4 {
				continue
			}
			file := strings.TrimSpace(line[3:])
			if isRootLevelChange(file) {
				runAll = true
			}
			if pkg := fileToPackagePath(file); pkg != "" {
				directlyChanged[pkg] = true
			}
		}
	}

	if len(directlyChanged) == 0 && !runAll {
		return ciAffectedResult{}
	}

	// Resolve transitive dependents
	affected := resolveTransitiveDependents(directlyChanged)

	var shortNames []string
	var fullPaths []string
	for pkg := range affected {
		fullPaths = append(fullPaths, pkg)
		// Convert "libs/engine" → "engine" for pnpm --filter
		parts := strings.SplitN(pkg, "/", 2)
		if len(parts) == 2 {
			shortNames = append(shortNames, parts[1])
		}
	}
	return ciAffectedResult{shortNames: shortNames, fullPaths: fullPaths, runAll: runAll}
}

// isRootLevelChange returns true if a file path represents a root-level
// change that should trigger a full CI run.
func isRootLevelChange(file string) bool {
	for _, rf := range rootLevelFiles {
		if file == rf {
			return true
		}
	}
	return strings.HasPrefix(file, "scripts/")
}

// runInPackage runs a command in a specific package directory.
func runInPackage(cfg *config.Config, label, pkgName, dir string, cmdArgs []string) error {
	if !cfg.JSONMode {
		fmt.Printf("  %s %s...\n", label, pkgName)
	}

	// Save cwd and change to package dir
	origDir, _ := os.Getwd()
	if err := os.Chdir(dir); err != nil {
		return fmt.Errorf("cannot enter package directory: %w", err)
	}
	defer os.Chdir(origDir)

	result, err := exec.RunWithTimeout(5*time.Minute, cmdArgs[0], cmdArgs[1:]...)
	if err != nil {
		return fmt.Errorf("%s failed: %w", label, err)
	}

	if cfg.JSONMode {
		data, _ := json.Marshal(map[string]interface{}{
			"package": pkgName,
			"passed":  result.OK(),
		})
		fmt.Println(string(data))
	} else {
		if result.OK() {
			ui.Step(true, fmt.Sprintf("%s %s", label, pkgName))
		} else {
			ui.Step(false, fmt.Sprintf("%s %s", label, pkgName))
			if result.Stderr != "" {
				fmt.Println(result.Stderr)
			}
			if result.Stdout != "" {
				fmt.Println(result.Stdout)
			}
			os.Exit(1)
		}
	}
	return nil
}

// runMonorepoCommand runs a monorepo-wide command from root.
func runMonorepoCommand(cfg *config.Config, label string, cmdArgs []string) error {
	root := cfg.GroveRoot

	if !cfg.JSONMode {
		fmt.Printf("  %s...\n", label)
	}

	origDir, _ := os.Getwd()
	if err := os.Chdir(root); err != nil {
		return fmt.Errorf("cannot enter monorepo root: %w", err)
	}
	defer os.Chdir(origDir)

	result, err := exec.RunWithTimeout(10*time.Minute, cmdArgs[0], cmdArgs[1:]...)
	if err != nil {
		return fmt.Errorf("%s failed: %w", label, err)
	}

	if cfg.JSONMode {
		data, _ := json.Marshal(map[string]interface{}{
			"passed": result.OK(),
		})
		fmt.Println(string(data))
	} else {
		ui.Step(result.OK(), label)
		if !result.OK() {
			if result.Stderr != "" {
				fmt.Println(result.Stderr)
			}
			os.Exit(1)
		}
	}
	return nil
}

// printDryRun outputs a dry-run JSON summary.
func printDryRun(cfg *config.Config, pkg string, cmdArgs []string) error {
	data, _ := json.MarshalIndent(map[string]interface{}{
		"dry_run": true,
		"package": pkg,
		"command": cmdArgs,
	}, "", "  ")
	fmt.Println(string(data))
	return nil
}

// containsAny returns true if the slice contains any of the given values.
func containsAny(slice []string, values ...string) bool {
	set := make(map[string]bool, len(slice))
	for _, s := range slice {
		set[s] = true
	}
	for _, v := range values {
		if set[v] {
			return true
		}
	}
	return false
}

// rebuildLibraries runs build/package commands for affected libraries,
// matching the grove-setup GitHub Action's build steps.
// Order matters: prism → foliage → gossamer → engine (dependency chain).
func rebuildLibraries(cfg *config.Config, root string, affectedPaths []string, runAll, dryRun bool) error {
	type libBuild struct {
		path    string // e.g. "libs/foliage"
		command []string
		label   string
	}

	// Ordered by dependency chain (upstream first)
	libs := []libBuild{
		{"libs/foliage", []string{"pnpm", "run", "build"}, "Building foliage"},
		{"libs/gossamer", []string{"pnpm", "run", "build"}, "Building gossamer"},
		{"libs/engine", []string{"pnpm", "run", "package"}, "Packaging engine"},
	}

	affected := make(map[string]bool, len(affectedPaths))
	for _, p := range affectedPaths {
		affected[p] = true
	}

	// Determine which libs need rebuilding: the lib itself changed,
	// OR one of its upstream deps changed (prism/infra → engine chain)
	needsBuild := make(map[string]bool)
	if runAll {
		for _, lib := range libs {
			needsBuild[lib.path] = true
		}
	} else {
		// If prism or infra changed, foliage and engine need rebuild
		if affected["libs/prism"] {
			needsBuild["libs/foliage"] = true
			needsBuild["libs/engine"] = true
		}
		if affected["libs/infra"] {
			needsBuild["libs/engine"] = true
		}
		if affected["libs/foliage"] {
			needsBuild["libs/foliage"] = true
			needsBuild["libs/engine"] = true
		}
		if affected["libs/gossamer"] {
			needsBuild["libs/gossamer"] = true
			needsBuild["libs/engine"] = true
		}
		if affected["libs/engine"] {
			needsBuild["libs/engine"] = true
		}
		// Also rebuild if any engine dependent is affected (they need fresh dist/)
		engineDeps := dependents["libs/engine"]
		for _, dep := range engineDeps {
			if affected[dep] {
				needsBuild["libs/engine"] = true
				break
			}
		}
	}

	if len(needsBuild) == 0 {
		return nil
	}

	if !cfg.JSONMode && !dryRun {
		fmt.Println("  > Rebuilding libraries...")
	}

	for _, lib := range libs {
		if !needsBuild[lib.path] {
			continue
		}
		dir := filepath.Join(root, lib.path)
		if _, err := os.Stat(dir); os.IsNotExist(err) {
			continue
		}

		if dryRun {
			if !cfg.JSONMode {
				ui.Step(true, fmt.Sprintf("[dry-run] %s", lib.label))
			}
			continue
		}

		if !cfg.JSONMode {
			fmt.Printf("    %s...\n", lib.label)
		}

		result, err := exec.RunInDirWithTimeout(5*time.Minute, dir, lib.command[0], lib.command[1:]...)
		if err != nil {
			return fmt.Errorf("%s failed: %w", lib.label, err)
		}
		if !result.OK() {
			if !cfg.JSONMode {
				ui.Step(false, lib.label)
				if result.Stderr != "" {
					fmt.Println(result.Stderr)
				}
			}
			return fmt.Errorf("%s failed with exit code %d", lib.label, result.ExitCode)
		}
		if !cfg.JSONMode {
			ui.Step(true, lib.label)
		}
	}

	return nil
}

// capitalizeFirst capitalizes the first letter of a string.
func capitalizeFirst(s string) string {
	if s == "" {
		return s
	}
	return strings.ToUpper(s[:1]) + s[1:]
}

// aliasCmd creates a top-level alias that shares RunE and flags with the original.
func aliasCmd(use, short string, original *cobra.Command) *cobra.Command {
	alias := &cobra.Command{
		Use:   use,
		Short: short,
		RunE:  original.RunE,
	}
	original.Flags().VisitAll(func(f *pflag.Flag) {
		alias.Flags().AddFlag(f)
	})
	return alias
}

func init() {
	// --- Register flags FIRST (before aliases copy them) ---

	// test flags
	testCmd.Flags().StringP("package", "p", "", "Package name")
	testCmd.Flags().Bool("all", false, "Run tests for all packages")
	testCmd.Flags().BoolP("watch", "w", false, "Watch mode")
	testCmd.Flags().BoolP("coverage", "c", false, "Generate coverage report")
	testCmd.Flags().StringP("filter", "k", "", "Filter tests by name")
	testCmd.Flags().Bool("dry-run", false, "Preview command without execution")

	// build flags
	buildCmd.Flags().StringP("package", "p", "", "Package name")
	buildCmd.Flags().Bool("all", false, "Build all packages")
	buildCmd.Flags().Bool("clean", false, "Clean build artifacts first")
	buildCmd.Flags().Bool("dry-run", false, "Preview command without execution")

	// check flags
	checkCmd.Flags().StringP("package", "p", "", "Package name")
	checkCmd.Flags().Bool("all", false, "Check all packages")
	checkCmd.Flags().BoolP("watch", "w", false, "Watch mode")
	checkCmd.Flags().Bool("strict", false, "Strict mode (fail on warnings)")
	checkCmd.Flags().Bool("dry-run", false, "Preview command without execution")

	// lint flags
	lintCmd.Flags().StringP("package", "p", "", "Package name")
	lintCmd.Flags().Bool("all", false, "Lint all packages")
	lintCmd.Flags().Bool("fix", false, "Auto-fix issues where possible")
	lintCmd.Flags().Bool("dry-run", false, "Preview command without execution")

	// fmt flags
	fmtCmd.Flags().StringP("package", "p", "", "Package name")
	fmtCmd.Flags().Bool("all", false, "Format all packages")
	fmtCmd.Flags().Bool("check", false, "Check only (don't write changes)")
	fmtCmd.Flags().Bool("dry-run", false, "Preview command without execution")

	// ci flags
	ciCmd.Flags().StringP("package", "p", "", "Run CI for specific package")
	ciCmd.Flags().Bool("affected", false, "Only run CI for affected packages")
	ciCmd.Flags().Bool("full", false, "Run CI for ALL packages regardless of changes")
	ciCmd.Flags().Bool("skip-lint", false, "Skip linting step")
	ciCmd.Flags().Bool("skip-check", false, "Skip type checking step")
	ciCmd.Flags().Bool("skip-test", false, "Skip testing step")
	ciCmd.Flags().Bool("skip-build", false, "Skip build step")
	ciCmd.Flags().Bool("fail-fast", false, "Stop on first failure")
	ciCmd.Flags().Bool("diagnose", false, "Show structured error diagnostics")
	ciCmd.Flags().Bool("dry-run", false, "Preview all steps without execution")

	// --- dev subcommands ---
	devCmd.AddCommand(testCmd)
	devCmd.AddCommand(buildCmd)
	devCmd.AddCommand(checkCmd)
	devCmd.AddCommand(lintCmd)
	devCmd.AddCommand(fmtCmd)
	devCmd.AddCommand(ciCmd)

	// --- top-level aliases (flags already registered, safe to copy) ---
	rootCmd.AddCommand(aliasCmd("test", "Run tests (alias for dev test)", testCmd))
	rootCmd.AddCommand(aliasCmd("build", "Build a package (alias for dev build)", buildCmd))
	rootCmd.AddCommand(aliasCmd("check", "Type-check a package (alias for dev check)", checkCmd))
	rootCmd.AddCommand(aliasCmd("lint", "Lint a package (alias for dev lint)", lintCmd))
	rootCmd.AddCommand(aliasCmd("ci", "Run full CI pipeline (alias for dev ci)", ciCmd))
}

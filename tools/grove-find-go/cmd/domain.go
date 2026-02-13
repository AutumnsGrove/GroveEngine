package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/spf13/cobra"

	"github.com/AutumnsGrove/GroveEngine/tools/grove-find-go/internal/config"
	"github.com/AutumnsGrove/GroveEngine/tools/grove-find-go/internal/output"
	"github.com/AutumnsGrove/GroveEngine/tools/grove-find-go/internal/search"
)

// ---------- routes ----------

var routesFlagGuards bool

var routesCmd = &cobra.Command{
	Use:   "routes [pattern]",
	Short: "Find SvelteKit routes",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()
		pattern := ""
		if len(args) > 0 {
			pattern = args[0]
		}

		if routesFlagGuards {
			return routesGuards(cfg)
		}

		if pattern != "" {
			return routesFiltered(cfg, pattern)
		}

		return routesOverview(cfg)
	},
}

func init() {
	routesCmd.Flags().BoolVarP(&routesFlagGuards, "guards", "g", false, "Show auth guards and protected routes")
}

func routesGuards(cfg *config.Config) error {
	output.PrintSection("Route Guards (Auth/Redirect)")

	type sectionResult struct {
		title string
		lines []string
		err   error
	}

	results := make([]sectionResult, 2)
	var wg sync.WaitGroup
	wg.Add(2)

	// 1. Server load functions with auth
	go func() {
		defer wg.Done()
		out, err := search.RunRg(
			`(redirect|session|auth|locals\.user|locals\.session)`,
			search.WithGlob("**/+page.server.ts"),
			search.WithGlob("**/+layout.server.ts"),
		)
		results[0] = sectionResult{title: "Server Load Functions with Auth", lines: search.SplitLines(out), err: err}
	}()

	// 2. Auth hooks
	go func() {
		defer wg.Done()
		out, err := search.RunRg(
			`(handle|auth|session|redirect)`,
			search.WithGlob("**/hooks.server.ts"),
		)
		results[1] = sectionResult{title: "Auth Hooks (hooks.server.ts)", lines: search.SplitLines(out), err: err}
	}()

	wg.Wait()

	for _, r := range results {
		if r.err != nil {
			return fmt.Errorf("search failed in %s: %w", r.title, r.err)
		}
	}

	// Protected routes summary via file reading
	serverFiles, err := search.FindFilesByGlob([]string{"**/+page.server.ts"})
	if err != nil {
		return fmt.Errorf("finding server files failed: %w", err)
	}

	var protected []string
	for _, fp := range serverFiles {
		if strings.Contains(fp, "node_modules") {
			continue
		}
		fullPath := filepath.Join(cfg.GroveRoot, fp)
		data, err := os.ReadFile(fullPath)
		if err != nil {
			continue
		}
		content := string(data)
		if strings.Contains(content, "redirect") ||
			strings.Contains(content, "session") ||
			strings.Contains(content, "locals.user") {
			rel, relErr := filepath.Rel(cfg.GroveRoot, fullPath)
			if relErr != nil {
				rel = fp
			}
			protected = append(protected, rel)
		}
	}

	if cfg.JSONMode {
		jsonData := map[string]any{
			"command":          "routes",
			"mode":             "guards",
			"server_auth":      results[0].lines,
			"auth_hooks":       results[1].lines,
			"protected_routes": protected,
		}
		output.PrintJSON(jsonData)
		return nil
	}

	output.PrintSection("Server Load Functions with Auth")
	if len(results[0].lines) > 0 {
		show, _ := output.TruncateResults(results[0].lines, 30)
		output.PrintRaw(strings.Join(show, "\n") + "\n")
	} else {
		output.PrintNoResults("auth guards")
	}

	output.PrintSection("Auth Hooks (hooks.server.ts)")
	if len(results[1].lines) > 0 {
		show, _ := output.TruncateResults(results[1].lines, 20)
		output.PrintRaw(strings.Join(show, "\n") + "\n")
	} else {
		output.PrintNoResults("auth hooks")
	}

	output.PrintSection("Protected Routes Summary")
	if len(protected) > 0 {
		output.Printf("  %d protected routes:", len(protected))
		show, overflow := output.TruncateResults(protected, 15)
		for _, route := range show {
			output.Printf("    %s", route)
		}
		if overflow > 0 {
			output.Printf("    ... and %d more", overflow)
		}
	} else {
		output.PrintNoResults("protected routes")
	}

	return nil
}

func routesFiltered(cfg *config.Config, pattern string) error {
	output.PrintSection(fmt.Sprintf("SvelteKit routes matching: %s", pattern))

	type sectionResult struct {
		title string
		lines []string
		err   error
	}

	results := make([]sectionResult, 2)
	var wg sync.WaitGroup
	wg.Add(2)

	// Page routes matching pattern
	go func() {
		defer wg.Done()
		files, err := search.FindFilesByGlob([]string{"**/+page.svelte"})
		if err != nil {
			results[0] = sectionResult{title: "Page Routes", err: err}
			return
		}
		lowerPattern := strings.ToLower(pattern)
		var filtered []string
		for _, f := range files {
			if strings.Contains(strings.ToLower(f), lowerPattern) {
				filtered = append(filtered, f)
			}
		}
		results[0] = sectionResult{title: "Page Routes", lines: filtered}
	}()

	// API routes matching pattern
	go func() {
		defer wg.Done()
		files, err := search.FindFilesByGlob([]string{"**/+server.ts"})
		if err != nil {
			results[1] = sectionResult{title: "API Routes", err: err}
			return
		}
		lowerPattern := strings.ToLower(pattern)
		var filtered []string
		for _, f := range files {
			if strings.Contains(strings.ToLower(f), lowerPattern) {
				filtered = append(filtered, f)
			}
		}
		results[1] = sectionResult{title: "API Routes", lines: filtered}
	}()

	wg.Wait()

	for _, r := range results {
		if r.err != nil {
			return fmt.Errorf("search failed in %s: %w", r.title, r.err)
		}
	}

	if cfg.JSONMode {
		output.PrintJSON(map[string]any{
			"command":    "routes",
			"pattern":    pattern,
			"page_routes": results[0].lines,
			"api_routes":  results[1].lines,
		})
		return nil
	}

	for _, r := range results {
		output.PrintSection(r.title)
		if len(r.lines) > 0 {
			show, _ := output.TruncateResults(r.lines, 30)
			output.PrintRaw(strings.Join(show, "\n") + "\n")
		} else {
			output.PrintNoResults(fmt.Sprintf("matching %s", strings.ToLower(r.title)))
		}
	}

	return nil
}

func routesOverview(cfg *config.Config) error {
	output.PrintSection("SvelteKit Routes")

	type sectionResult struct {
		title string
		lines []string
		err   error
	}

	results := make([]sectionResult, 4)
	var wg sync.WaitGroup
	wg.Add(4)

	go func() {
		defer wg.Done()
		files, err := search.FindFilesByGlob([]string{"**/+page.svelte"})
		results[0] = sectionResult{title: "Page Routes", lines: files, err: err}
	}()

	go func() {
		defer wg.Done()
		files, err := search.FindFilesByGlob([]string{"**/+server.ts"})
		results[1] = sectionResult{title: "API Routes", lines: files, err: err}
	}()

	go func() {
		defer wg.Done()
		files, err := search.FindFilesByGlob([]string{"**/+layout.svelte"})
		results[2] = sectionResult{title: "Layouts", lines: files, err: err}
	}()

	go func() {
		defer wg.Done()
		files, err := search.FindFilesByGlob([]string{"**/+error.svelte"})
		results[3] = sectionResult{title: "Error Pages", lines: files, err: err}
	}()

	wg.Wait()

	for _, r := range results {
		if r.err != nil {
			return fmt.Errorf("search failed in %s: %w", r.title, r.err)
		}
	}

	if cfg.JSONMode {
		output.PrintJSON(map[string]any{
			"command":     "routes",
			"page_routes": results[0].lines,
			"api_routes":  results[1].lines,
			"layouts":     results[2].lines,
			"error_pages": results[3].lines,
		})
		return nil
	}

	for _, r := range results {
		maxLines := 30
		if r.title == "Layouts" || r.title == "Error Pages" {
			maxLines = 20
		}
		output.PrintSection(r.title)
		if len(r.lines) > 0 {
			show, _ := output.TruncateResults(r.lines, maxLines)
			output.PrintRaw(strings.Join(show, "\n") + "\n")
			if r.title == "Page Routes" || r.title == "API Routes" {
				output.Printf("  (%d total)", len(r.lines))
			}
		} else {
			output.PrintNoResults(strings.ToLower(r.title))
		}
	}

	return nil
}

// ---------- db ----------

var dbCmd = &cobra.Command{
	Use:   "db [table]",
	Short: "Find database queries",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		if len(args) > 0 {
			table := args[0]
			output.PrintSection(fmt.Sprintf("Database queries for: %s", table))

			pattern := fmt.Sprintf(`(SELECT|INSERT|UPDATE|DELETE).*%s`, table)
			result, err := search.RunRg(pattern,
				search.WithType("ts"),
				search.WithType("js"),
			)
			if err != nil {
				return fmt.Errorf("search failed: %w", err)
			}

			if cfg.JSONMode {
				lines := search.SplitLines(result)
				output.PrintJSON(map[string]any{
					"command": "db",
					"table":   table,
					"count":   len(lines),
					"results": lines,
				})
				return nil
			}

			if result != "" {
				output.PrintRaw(strings.TrimRight(result, "\n") + "\n")
			} else {
				output.PrintNoResults("queries")
			}
		} else {
			output.PrintSection("Database Queries")

			result, err := search.RunRg(`db\.(prepare|exec|batch)`,
				search.WithType("ts"),
				search.WithType("js"),
			)
			if err != nil {
				return fmt.Errorf("search failed: %w", err)
			}

			if cfg.JSONMode {
				lines := search.SplitLines(result)
				output.PrintJSON(map[string]any{
					"command": "db",
					"count":   len(lines),
					"results": lines,
				})
				return nil
			}

			if result != "" {
				lines := search.SplitLines(result)
				show, overflow := output.TruncateResults(lines, 50)
				output.PrintRaw(strings.Join(show, "\n") + "\n")
				if overflow > 0 {
					output.Printf("  ... and %d more", overflow)
				}
			} else {
				output.PrintNoResults("database queries")
			}
		}

		return nil
	},
}

// ---------- glass ----------

var glassCmd = &cobra.Command{
	Use:   "glass [variant]",
	Short: "Find Glass component usage",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		if len(args) > 0 {
			variant := args[0]
			output.PrintSection(fmt.Sprintf("Glass components with variant: %s", variant))

			pattern := fmt.Sprintf(`Glass.*variant.*['"%s]`, variant)
			result, err := search.RunRg(pattern,
				search.WithGlob("*.{svelte,ts}"),
			)
			if err != nil {
				return fmt.Errorf("search failed: %w", err)
			}

			if cfg.JSONMode {
				lines := search.SplitLines(result)
				output.PrintJSON(map[string]any{
					"command": "glass",
					"variant": variant,
					"count":   len(lines),
					"results": lines,
				})
				return nil
			}

			if result != "" {
				output.PrintRaw(strings.TrimRight(result, "\n") + "\n")
			} else {
				output.PrintNoResults("glass variants")
			}
		} else {
			output.PrintSection("Glass Component Usage")

			result, err := search.RunRg(`<Glass`,
				search.WithGlob("*.svelte"),
			)
			if err != nil {
				return fmt.Errorf("search failed: %w", err)
			}

			if cfg.JSONMode {
				lines := search.SplitLines(result)
				output.PrintJSON(map[string]any{
					"command": "glass",
					"count":   len(lines),
					"results": lines,
				})
				return nil
			}

			if result != "" {
				lines := search.SplitLines(result)
				show, overflow := output.TruncateResults(lines, 50)
				output.PrintRaw(strings.Join(show, "\n") + "\n")
				if overflow > 0 {
					output.Printf("  ... and %d more", overflow)
				}
			} else {
				output.PrintNoResults("Glass components")
			}
		}

		return nil
	},
}

// ---------- store ----------

var storeCmd = &cobra.Command{
	Use:   "store [name]",
	Short: "Find Svelte stores",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		if len(args) > 0 {
			name := args[0]
			output.PrintSection(fmt.Sprintf("Svelte stores/state matching: %s", name))

			type sectionResult struct {
				title string
				lines []string
				err   error
			}

			results := make([]sectionResult, 2)
			var wg sync.WaitGroup
			wg.Add(2)

			// Svelte 4 stores
			go func() {
				defer wg.Done()
				pattern := fmt.Sprintf(`(writable|readable|derived).*%s|%s.*(writable|readable|derived)`, name, name)
				out, err := search.RunRg(pattern,
					search.WithGlob("*.{ts,js,svelte}"),
				)
				results[0] = sectionResult{title: "Svelte 4 Stores", lines: search.SplitLines(out), err: err}
			}()

			// Svelte 5 runes
			go func() {
				defer wg.Done()
				pattern := fmt.Sprintf(`(\$state|\$derived|\$effect|\$bindable).*%s|%s.*(\$state|\$derived|\$effect|\$bindable)`, name, name)
				out, err := search.RunRg(pattern,
					search.WithGlob("*.{ts,js,svelte}"),
				)
				results[1] = sectionResult{title: "Svelte 5 Runes", lines: search.SplitLines(out), err: err}
			}()

			wg.Wait()

			for _, r := range results {
				if r.err != nil {
					return fmt.Errorf("search failed in %s: %w", r.title, r.err)
				}
			}

			if cfg.JSONMode {
				output.PrintJSON(map[string]any{
					"command":      "store",
					"name":         name,
					"v4_stores":    results[0].lines,
					"v5_runes":     results[1].lines,
				})
				return nil
			}

			anyResults := false
			for _, r := range results {
				if len(r.lines) > 0 {
					anyResults = true
					output.PrintRaw(strings.Join(r.lines, "\n") + "\n")
				}
			}
			if !anyResults {
				output.PrintNoResults("stores/state")
			}
		} else {
			output.PrintSection("Svelte Stores & Reactive State")

			type sectionResult struct {
				title string
				lines []string
				err   error
			}

			results := make([]sectionResult, 3)
			var wg sync.WaitGroup
			wg.Add(3)

			// Store files
			go func() {
				defer wg.Done()
				files, err := search.FindFiles("store", search.WithGlob("*.{ts,js}"))
				if err == nil && files != nil {
					var filtered []string
					for _, f := range files {
						if !strings.Contains(f, "_deprecated") {
							filtered = append(filtered, f)
						}
					}
					files = filtered
				}
				results[0] = sectionResult{title: "Store Files", lines: files, err: err}
			}()

			// Svelte 4 store definitions
			go func() {
				defer wg.Done()
				out, err := search.RunRg(
					`export\s+(const|let).*=\s*(writable|readable|derived)`,
					search.WithType("ts"),
					search.WithType("js"),
					search.WithGlob("!_deprecated"),
				)
				results[1] = sectionResult{title: "Svelte 4 Stores (writable/readable/derived)", lines: search.SplitLines(out), err: err}
			}()

			// Svelte 5 runes
			go func() {
				defer wg.Done()
				out, err := search.RunRg(
					`\$state\(|\$state\.snapshot|\$derived\(|\$derived\.by|\$effect\(|\$bindable\(`,
					search.WithGlob("*.{ts,js,svelte}"),
					search.WithGlob("!_deprecated"),
				)
				results[2] = sectionResult{title: "Svelte 5 Runes ($state/$derived/$effect)", lines: search.SplitLines(out), err: err}
			}()

			wg.Wait()

			for _, r := range results {
				if r.err != nil {
					return fmt.Errorf("search failed in %s: %w", r.title, r.err)
				}
			}

			if cfg.JSONMode {
				output.PrintJSON(map[string]any{
					"command":      "store",
					"store_files":  results[0].lines,
					"v4_stores":    results[1].lines,
					"v5_runes":     results[2].lines,
				})
				return nil
			}

			limits := []int{20, 30, 30}
			for i, r := range results {
				output.PrintSection(r.title)
				if len(r.lines) > 0 {
					show, overflow := output.TruncateResults(r.lines, limits[i])
					output.PrintRaw(strings.Join(show, "\n") + "\n")
					if overflow > 0 {
						output.Printf("  ... and %d more", overflow)
					}
				} else {
					output.PrintNoResults(strings.ToLower(r.title))
				}
			}
		}

		return nil
	},
}

// ---------- type ----------

var typeCmd = &cobra.Command{
	Use:   "type [name]",
	Short: "Find TypeScript type/interface definitions",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		if len(args) > 0 {
			name := args[0]
			output.PrintSection(fmt.Sprintf("Finding type: %s", name))

			type sectionResult struct {
				title string
				lines []string
				err   error
			}

			results := make([]sectionResult, 2)
			var wg sync.WaitGroup
			wg.Add(2)

			// Definition
			go func() {
				defer wg.Done()
				pattern := fmt.Sprintf(`(type|interface|enum)\s+%s`, name)
				out, err := search.RunRg(pattern, search.WithType("ts"))
				results[0] = sectionResult{title: "Definition", lines: search.SplitLines(out), err: err}
			}()

			// Usage
			go func() {
				defer wg.Done()
				pattern := fmt.Sprintf(`:\s*%s\b|<%s>|as\s+%s`, name, name, name)
				out, err := search.RunRg(pattern, search.WithType("ts"))
				results[1] = sectionResult{title: fmt.Sprintf("Usage of %s", name), lines: search.SplitLines(out), err: err}
			}()

			wg.Wait()

			for _, r := range results {
				if r.err != nil {
					return fmt.Errorf("search failed in %s: %w", r.title, r.err)
				}
			}

			if cfg.JSONMode {
				output.PrintJSON(map[string]any{
					"command":    "type",
					"name":       name,
					"definition": results[0].lines,
					"usage":      results[1].lines,
				})
				return nil
			}

			// Definition
			output.PrintSection(results[0].title)
			if len(results[0].lines) > 0 {
				output.PrintRaw(strings.Join(results[0].lines, "\n") + "\n")
			} else {
				output.PrintNoResults("definition")
			}

			// Usage
			output.PrintSection(results[1].title)
			if len(results[1].lines) > 0 {
				show, _ := output.TruncateResults(results[1].lines, 20)
				output.PrintRaw(strings.Join(show, "\n") + "\n")
			} else {
				output.PrintNoResults("usage")
			}
		} else {
			output.PrintSection("TypeScript Types")

			type sectionResult struct {
				title string
				lines []string
				err   error
			}

			results := make([]sectionResult, 3)
			var wg sync.WaitGroup
			wg.Add(3)

			// Exported types
			go func() {
				defer wg.Done()
				out, err := search.RunRg(
					`^export\s+(type|interface)\s+\w+`,
					search.WithGlob("!*.d.ts"),
					search.WithType("ts"),
				)
				results[0] = sectionResult{title: "Type Definitions", lines: search.SplitLines(out), err: err}
			}()

			// Enums
			go func() {
				defer wg.Done()
				out, err := search.RunRg(
					`^export\s+enum\s+\w+`,
					search.WithType("ts"),
				)
				results[1] = sectionResult{title: "Enums", lines: search.SplitLines(out), err: err}
			}()

			// Type files
			go func() {
				defer wg.Done()
				files, err := search.FindFiles("types?", search.WithGlob("*.ts"))
				if err == nil && files != nil {
					var filtered []string
					for _, f := range files {
						if !strings.HasSuffix(f, ".d.ts") {
							filtered = append(filtered, f)
						}
					}
					files = filtered
				}
				results[2] = sectionResult{title: "Type Files", lines: files, err: err}
			}()

			wg.Wait()

			for _, r := range results {
				if r.err != nil {
					return fmt.Errorf("search failed in %s: %w", r.title, r.err)
				}
			}

			if cfg.JSONMode {
				output.PrintJSON(map[string]any{
					"command":          "type",
					"type_definitions": results[0].lines,
					"enums":            results[1].lines,
					"type_files":       results[2].lines,
				})
				return nil
			}

			limits := []int{30, 15, 20}
			for i, r := range results {
				output.PrintSection(r.title)
				if len(r.lines) > 0 {
					show, _ := output.TruncateResults(r.lines, limits[i])
					output.PrintRaw(strings.Join(show, "\n") + "\n")
				} else {
					output.PrintNoResults(strings.ToLower(r.title))
				}
			}
		}

		return nil
	},
}

// ---------- export ----------

var exportCmd = &cobra.Command{
	Use:   "export [pattern]",
	Short: "Find module exports",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		if len(args) > 0 {
			pattern := args[0]
			output.PrintSection(fmt.Sprintf("Exports matching: %s", pattern))

			type sectionResult struct {
				title string
				lines []string
				err   error
			}

			results := make([]sectionResult, 2)
			var wg sync.WaitGroup
			wg.Add(2)

			// Named exports
			go func() {
				defer wg.Done()
				rgPattern := fmt.Sprintf(
					`export\s+(default\s+)?(const|let|function|class|type|interface|enum)\s+.*%s`,
					pattern,
				)
				out, err := search.RunRg(rgPattern,
					search.WithType("ts"),
					search.WithType("js"),
				)
				results[0] = sectionResult{title: "Exports", lines: search.SplitLines(out), err: err}
			}()

			// Re-exports
			go func() {
				defer wg.Done()
				rgPattern := fmt.Sprintf(`export\s+\{[^}]*%s`, pattern)
				out, err := search.RunRg(rgPattern,
					search.WithType("ts"),
					search.WithType("js"),
				)
				results[1] = sectionResult{title: "Re-exports", lines: search.SplitLines(out), err: err}
			}()

			wg.Wait()

			for _, r := range results {
				if r.err != nil {
					return fmt.Errorf("search failed in %s: %w", r.title, r.err)
				}
			}

			if cfg.JSONMode {
				output.PrintJSON(map[string]any{
					"command":    "export",
					"pattern":    pattern,
					"exports":    results[0].lines,
					"re_exports": results[1].lines,
				})
				return nil
			}

			output.PrintSection(results[0].title)
			if len(results[0].lines) > 0 {
				output.PrintRaw(strings.Join(results[0].lines, "\n") + "\n")
			} else {
				output.PrintNoResults("exports")
			}

			output.PrintSection(results[1].title)
			if len(results[1].lines) > 0 {
				show, _ := output.TruncateResults(results[1].lines, 15)
				output.PrintRaw(strings.Join(show, "\n") + "\n")
			} else {
				output.PrintNoResults("re-exports")
			}
		} else {
			output.PrintSection("Module Exports")

			type sectionResult struct {
				title string
				lines []string
				err   error
			}

			results := make([]sectionResult, 3)
			var wg sync.WaitGroup
			wg.Add(3)

			// Default exports
			go func() {
				defer wg.Done()
				out, err := search.RunRg(`export\s+default`,
					search.WithGlob("*.{ts,js,svelte}"),
				)
				results[0] = sectionResult{title: "Default Exports", lines: search.SplitLines(out), err: err}
			}()

			// Named exports
			go func() {
				defer wg.Done()
				out, err := search.RunRg(
					`^export\s+(const|let|function|class|async function)`,
					search.WithType("ts"),
					search.WithType("js"),
				)
				results[1] = sectionResult{title: "Named Exports", lines: search.SplitLines(out), err: err}
			}()

			// Barrel exports (index.ts files)
			go func() {
				defer wg.Done()
				files, err := search.FindFiles("index.ts")
				results[2] = sectionResult{title: "Barrel Exports (index.ts)", lines: files, err: err}
			}()

			wg.Wait()

			for _, r := range results {
				if r.err != nil {
					return fmt.Errorf("search failed in %s: %w", r.title, r.err)
				}
			}

			if cfg.JSONMode {
				output.PrintJSON(map[string]any{
					"command":         "export",
					"default_exports": results[0].lines,
					"named_exports":   results[1].lines,
					"barrel_exports":  results[2].lines,
				})
				return nil
			}

			limits := []int{20, 25, 20}
			for i, r := range results {
				output.PrintSection(r.title)
				if len(r.lines) > 0 {
					show, _ := output.TruncateResults(r.lines, limits[i])
					output.PrintRaw(strings.Join(show, "\n") + "\n")
				} else {
					output.PrintNoResults(strings.ToLower(r.title))
				}
			}
		}

		return nil
	},
}

// ---------- auth ----------

var authCmd = &cobra.Command{
	Use:   "auth [aspect]",
	Short: "Find authentication code",
	Args:  cobra.MaximumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg := config.Get()

		if len(args) > 0 {
			aspect := args[0]
			output.PrintSection(fmt.Sprintf("Auth code related to: %s", aspect))

			result, err := search.RunRg(aspect,
				search.WithGlob("*.{ts,js,svelte}"),
			)
			if err != nil {
				return fmt.Errorf("search failed: %w", err)
			}

			authKeywords := []string{
				"auth", "session", "token", "login", "logout",
				"user", "credential", "oauth", "jwt",
			}

			lines := search.SplitLines(result)
			var filtered []string
			for _, line := range lines {
				lower := strings.ToLower(line)
				for _, kw := range authKeywords {
					if strings.Contains(lower, kw) {
						filtered = append(filtered, line)
						break
					}
				}
			}

			if cfg.JSONMode {
				output.PrintJSON(map[string]any{
					"command": "auth",
					"aspect":  aspect,
					"count":   len(filtered),
					"results": filtered,
				})
				return nil
			}

			if len(filtered) > 0 {
				show, _ := output.TruncateResults(filtered, 30)
				output.PrintRaw(strings.Join(show, "\n") + "\n")
			} else {
				output.PrintNoResults("auth-related matches")
			}
		} else {
			output.PrintSection("Authentication Code")

			type sectionResult struct {
				title string
				lines []string
				err   error
			}

			results := make([]sectionResult, 4)
			var wg sync.WaitGroup
			wg.Add(4)

			// Auth files
			go func() {
				defer wg.Done()
				files, err := search.FindFiles("auth|login|session", search.WithGlob("*.{ts,js,svelte}"))
				results[0] = sectionResult{title: "Auth Files", lines: files, err: err}
			}()

			// Session handling
			go func() {
				defer wg.Done()
				out, err := search.RunRg(
					`(session|getSession|createSession|destroySession)`,
					search.WithType("ts"),
					search.WithType("js"),
				)
				results[1] = sectionResult{title: "Session Handling", lines: search.SplitLines(out), err: err}
			}()

			// Token operations
			go func() {
				defer wg.Done()
				out, err := search.RunRg(
					`(token|jwt|accessToken|refreshToken|bearer)`,
					search.WithExtraArgs("-i"),
					search.WithType("ts"),
					search.WithType("js"),
				)
				results[2] = sectionResult{title: "Token Operations", lines: search.SplitLines(out), err: err}
			}()

			// Heartwood/GroveAuth
			go func() {
				defer wg.Done()
				out, err := search.RunRg(
					`(heartwood|groveauth|GroveAuth)`,
					search.WithExtraArgs("-i"),
					search.WithType("ts"),
					search.WithType("js"),
				)
				results[3] = sectionResult{title: "Heartwood/GroveAuth", lines: search.SplitLines(out), err: err}
			}()

			wg.Wait()

			for _, r := range results {
				if r.err != nil {
					return fmt.Errorf("search failed in %s: %w", r.title, r.err)
				}
			}

			if cfg.JSONMode {
				jsonData := map[string]any{
					"command": "auth",
				}
				for _, r := range results {
					key := strings.ToLower(strings.ReplaceAll(r.title, " ", "_"))
					key = strings.ReplaceAll(key, "/", "_")
					jsonData[key] = r.lines
				}
				output.PrintJSON(jsonData)
				return nil
			}

			limits := []int{20, 20, 15, 15}
			for i, r := range results {
				output.PrintSection(r.title)
				if len(r.lines) > 0 {
					show, _ := output.TruncateResults(r.lines, limits[i])
					output.PrintRaw(strings.Join(show, "\n") + "\n")
				} else {
					output.PrintNoResults(strings.ToLower(r.title))
				}
			}
		}

		return nil
	},
}

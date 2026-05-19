package cmd

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/config"
	"github.com/AutumnsGrove/Lattice/tools/grove-wrap-go/internal/ui"
)

const maxGHLimit = 1000

func validateGHNumber(s string) error {
	num, err := strconv.Atoi(s)
	if err != nil {
		return fmt.Errorf("invalid number: %q", s)
	}
	if num <= 0 {
		return fmt.Errorf("number must be positive, got %d", num)
	}
	return nil
}

func clampGHLimit(limit int) int {
	if limit < 1 {
		return 1
	}
	if limit > maxGHLimit {
		return maxGHLimit
	}
	return limit
}

func paginateArgs(limit, page int, all bool) (fetchLimit, startIndex int) {
	if all {
		return 0, 0
	}
	limit = clampGHLimit(limit)
	if page < 1 {
		page = 1
	}
	fetchLimit = limit * page
	if fetchLimit > maxGHLimit {
		fetchLimit = maxGHLimit
	}
	startIndex = limit * (page - 1)
	return fetchLimit, startIndex
}

func slicePage[T any](items []T, startIndex, limit int) (page []T, hasMore bool) {
	if startIndex >= len(items) {
		return nil, false
	}
	end := startIndex + limit
	if end >= len(items) {
		return items[startIndex:], false
	}
	return items[startIndex:end], true
}

func ghRepoArgs() []string {
	cfg := config.Get()
	if cfg.GitHub.Owner != "" && cfg.GitHub.Repo != "" {
		return []string{"--repo", cfg.GitHub.Owner + "/" + cfg.GitHub.Repo}
	}
	return nil
}

func jsonFields(fields []string, jq string) []string {
	args := []string{"--json", strings.Join(fields, ",")}
	if jq != "" {
		args = append(args, "--jq", jq)
	}
	return args
}

func ghCommentsToItems(comments []map[string]interface{}) []ui.CommentItem {
	items := make([]ui.CommentItem, 0, len(comments))
	for _, c := range comments {
		author := ""
		if a, ok := c["author"].(map[string]interface{}); ok {
			author = fmt.Sprintf("%v", a["login"])
		}
		body, _ := c["body"].(string)
		createdAt, _ := c["createdAt"].(string)
		if len(createdAt) > 10 {
			createdAt = createdAt[:10]
		}
		items = append(items, ui.CommentItem{
			Author: author,
			Date:   createdAt,
			Body:   body,
		})
	}
	return items
}

func requireGHSafety(operation string) error {
	cfg := config.Get()
	effectiveWrite := cfg.WriteFlag || (cfg.IsInteractive() && !cfg.AgentMode)
	if !effectiveWrite {
		return fmt.Errorf("operation '%s' requires --write flag", operation)
	}
	return nil
}

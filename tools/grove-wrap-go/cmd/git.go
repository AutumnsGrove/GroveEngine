package cmd

import "github.com/spf13/cobra"

var gitCmd = &cobra.Command{
	Use:   "git",
	Short: "Git worktree management",
	Long:  "Git worktree finish — the one shortcut that earns its place.",
}

func init() {
	rootCmd.AddCommand(gitCmd)
}

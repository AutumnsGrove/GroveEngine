package cmd

import "github.com/spf13/cobra"

var ghCmd = &cobra.Command{
	Use:   "gh",
	Short: "GitHub issue management",
	Long:  "GitHub issue operations — list, view, create, and browse.",
}

func init() {
	rootCmd.AddCommand(ghCmd)
}

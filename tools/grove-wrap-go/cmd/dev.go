package cmd

import "github.com/spf13/cobra"

var devCmd = &cobra.Command{
	Use:   "dev",
	Short: "Local development stack",
	Long:  "Local development orchestration (to be built in Phase 3).",
	RunE: func(cmd *cobra.Command, args []string) error {
		return cmd.Help()
	},
}

func init() {
	rootCmd.AddCommand(devCmd)
}

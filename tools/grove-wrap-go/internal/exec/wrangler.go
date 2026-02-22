package exec

import "fmt"

// Wrangler runs a wrangler command and returns the result.
func Wrangler(args ...string) (*Result, error) {
	// Try npx wrangler first, fall back to direct wrangler
	if _, ok := Which("wrangler"); ok {
		return Run("wrangler", args...)
	}
	return Run("npx", append([]string{"wrangler"}, args...)...)
}

// WranglerOutput runs a wrangler command and returns stdout, or an error.
func WranglerOutput(args ...string) (string, error) {
	result, err := Wrangler(args...)
	if err != nil {
		return "", err
	}
	if !result.OK() {
		return "", fmt.Errorf("wrangler: %s", result.Stderr)
	}
	return result.Stdout, nil
}

// IsWranglerAvailable returns true if wrangler is accessible.
func IsWranglerAvailable() bool {
	if _, ok := Which("wrangler"); ok {
		return true
	}
	// Check via npx
	result, err := Run("npx", "wrangler", "--version")
	return err == nil && result.OK()
}

"""Mode-aware console output for Glimpse.

Three modes matching the gw/gf pattern:
  - human: Rich panels, colors, emoji, season flair
  - agent: Bare file path on stdout, errors on stderr
  - json:  Structured JSON dict on stdout
"""

import json
import re
import sys

from rich.console import Console
from rich.panel import Panel
from rich.text import Text

from glimpse.capture.screenshot import CaptureResult


# Season emoji for human-mode flair
SEASON_EMOJI = {
    "spring": "\U0001f331",    # 🌱
    "summer": "\u2600\ufe0f",  # ☀️
    "autumn": "\U0001f342",    # 🍂
    "winter": "\u2744\ufe0f",  # ❄️
    "midnight": "\U0001f319",  # 🌙
}

THEME_EMOJI = {
    "light": "\u2600\ufe0f",  # ☀️
    "dark": "\U0001f319",      # 🌙
    "system": "\U0001f5a5\ufe0f",  # 🖥️
}



class GlimpseOutput:
    """Mode-aware output handler for Glimpse captures."""

    def __init__(self, mode: str = "human") -> None:
        """Initialize with output mode: 'human', 'agent', or 'json'."""
        self.mode = mode
        self._console = Console(stderr=True) if mode != "human" else Console()

    def print_capture(self, result: CaptureResult) -> None:
        """Print a capture result in the appropriate mode."""
        if self.mode == "json":
            self._print_json(result)
        elif self.mode == "agent":
            self._print_agent(result)
        else:
            self._print_human(result)

    def print_error(self, message: str) -> None:
        """Print an error message."""
        if self.mode == "json":
            json.dump({"error": message}, sys.stdout)
            sys.stdout.write("\n")
        elif self.mode == "agent":
            print(f"ERROR: {message}", file=sys.stderr)
        else:
            self._console.print(f"[red]Error:[/red] {message}")

    def print_success(self, message: str) -> None:
        """Print a success message (human mode only, ignored in agent/json)."""
        if self.mode == "human":
            self._console.print(f"[green]\u2713[/green] {message}")

    def print_info(self, message: str) -> None:
        """Print an info message (human mode only, ignored in agent/json)."""
        if self.mode == "human":
            self._console.print(f"[dim]{message}[/dim]")

    def _print_human(self, result: CaptureResult) -> None:
        """Rich panel output with season flair."""
        if not result.success:
            self._console.print(f"[red]\u2717 Capture failed:[/red] {result.error}")
            return

        lines = []

        # Season + theme line
        if result.season:
            emoji = SEASON_EMOJI.get(result.season, "")
            lines.append(f"  Season:  {result.season} {emoji}")
        if result.theme:
            emoji = THEME_EMOJI.get(result.theme, "")
            lines.append(f"  Theme:   {result.theme} {emoji}")

        # Viewport
        w, h = result.viewport
        lines.append(f"  Size:    {w}\u00d7{h} @{result.scale}x")

        # File info
        size_str = _format_bytes(result.size_bytes)
        duration_str = f"{result.duration_ms}ms"
        lines.append("")
        lines.append(
            f"  [green]\u2713[/green] Captured \u2192 {result.output_path} "
            f"({size_str}, {duration_str})"
        )

        # Build the panel title from the URL
        title = f"Glimpse \u2014 {_display_url(result.url)}"

        content = "\n".join(lines)
        self._console.print()
        self._console.print(Panel(content, title=title, style="green", expand=False))
        self._console.print()

    def _print_agent(self, result: CaptureResult) -> None:
        """Bare path on stdout for agent consumption."""
        if result.success:
            print(str(result.output_path), file=sys.stdout)
        else:
            print(f"ERROR: {result.error}", file=sys.stderr)

    def _print_json(self, result: CaptureResult) -> None:
        """Structured JSON on stdout."""
        json.dump(result.to_dict(), sys.stdout, indent=2)
        sys.stdout.write("\n")


def _format_bytes(size: int) -> str:
    """Format byte count as human-readable string."""
    if size < 1024:
        return f"{size} B"
    elif size < 1024 * 1024:
        return f"{size / 1024:.1f} KB"
    else:
        return f"{size / (1024 * 1024):.1f} MB"


def _display_url(url: str) -> str:
    """Strip scheme from URL for display."""
    return re.sub(r"^https?://", "", url).rstrip("/")

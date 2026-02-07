"""Configuration loading for Glimpse.

Loads settings from .glimpse.toml (CWD or GROVE_ROOT), with environment
variable overrides. Follows the same dataclass + TOML pattern as gw's config.
"""

import os
from dataclasses import dataclass, field
from pathlib import Path

import tomli


@dataclass
class GlimpseConfig:
    """Glimpse configuration with sensible defaults matching the spec."""

    # [defaults]
    viewport_width: int = 1920
    viewport_height: int = 1080
    scale: int = 2
    wait_ms: int = 500
    format: str = "png"
    quality: int = 90
    output_dir: str = "screenshots"

    # [theme]
    season: str | None = None
    theme: str | None = None
    grove_mode: bool | None = None

    # [lumen] (forward-looking: Phase 4 Smart Detection)
    lumen_gateway_url: str | None = None
    lumen_model: str = "gemini-flash"

    # [browser]
    headless: bool = True
    browser: str = "chromium"
    timeout_ms: int = 30000

    # Runtime (not from config file)
    agent_mode: bool = False
    json_mode: bool = False
    verbose: bool = False

    @classmethod
    def load(cls, path: str | None = None) -> "GlimpseConfig":
        """Load config from file, falling back to defaults.

        Search order:
        1. Explicit path argument
        2. .glimpse.toml in CWD
        3. .glimpse.toml in GROVE_ROOT
        4. Pure defaults
        """
        config = cls()

        # Find config file
        config_path = cls._find_config(path)
        if config_path:
            try:
                config = cls._load_from_file(config_path)
            except (tomli.TOMLDecodeError, KeyError, TypeError, ValueError) as e:
                import sys
                print(
                    f"Warning: Failed to parse {config_path}: {e}. Using defaults.",
                    file=sys.stderr,
                )
                config = cls()

        # Apply environment variable overrides
        config._apply_env_overrides()

        return config

    @classmethod
    def _find_config(cls, explicit_path: str | None = None) -> Path | None:
        """Locate a .glimpse.toml config file."""
        if explicit_path:
            p = Path(explicit_path)
            if p.exists():
                return p
            return None

        # Check CWD
        cwd_config = Path.cwd() / ".glimpse.toml"
        if cwd_config.exists():
            return cwd_config

        # Check GROVE_ROOT
        grove_root = os.environ.get("GROVE_ROOT")
        if grove_root:
            root_config = Path(grove_root) / ".glimpse.toml"
            if root_config.exists():
                return root_config

        return None

    @classmethod
    def _load_from_file(cls, path: Path) -> "GlimpseConfig":
        """Parse a .glimpse.toml file into a GlimpseConfig."""
        with open(path, "rb") as f:
            data = tomli.load(f)

        config = cls()

        # [defaults]
        defaults = data.get("defaults", {})
        if "viewport_width" in defaults:
            config.viewport_width = defaults["viewport_width"]
        if "viewport_height" in defaults:
            config.viewport_height = defaults["viewport_height"]
        if "scale" in defaults:
            config.scale = defaults["scale"]
        if "wait" in defaults:
            config.wait_ms = defaults["wait"]
        if "format" in defaults:
            config.format = defaults["format"]
        if "quality" in defaults:
            config.quality = defaults["quality"]
        if "output_dir" in defaults:
            config.output_dir = defaults["output_dir"]

        # [theme]
        theme_section = data.get("theme", {})
        if "season" in theme_section:
            config.season = theme_section["season"]
        if "theme" in theme_section:
            config.theme = theme_section["theme"]
        if "grove_mode" in theme_section:
            config.grove_mode = theme_section["grove_mode"]

        # [lumen]
        lumen = data.get("lumen", {})
        if "gateway_url" in lumen:
            config.lumen_gateway_url = lumen["gateway_url"]
        if "model" in lumen:
            config.lumen_model = lumen["model"]

        # [browser]
        browser_section = data.get("browser", {})
        if "headless" in browser_section:
            config.headless = browser_section["headless"]
        if "browser" in browser_section:
            config.browser = browser_section["browser"]
        if "timeout" in browser_section:
            config.timeout_ms = browser_section["timeout"]

        return config

    def _apply_env_overrides(self) -> None:
        """Apply environment variable overrides."""
        if os.environ.get("GLIMPSE_OUTPUT_DIR"):
            self.output_dir = os.environ["GLIMPSE_OUTPUT_DIR"]

        if os.environ.get("GLIMPSE_AGENT"):
            self.agent_mode = True

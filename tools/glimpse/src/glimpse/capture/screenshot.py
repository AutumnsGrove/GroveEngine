"""Data structures for screenshot capture requests and results.

These dataclasses define the contract between the CLI layer (which builds
requests from flags + config) and the capture engine (which executes them).
"""

from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class CaptureRequest:
    """Everything needed to capture a single screenshot.

    Defaults match the spec: 1920x1080 viewport, 2x scale (retina),
    500ms wait after theme injection, PNG format at 90% quality.
    """

    url: str
    season: str | None = None
    theme: str | None = None
    grove_mode: bool | None = None
    selector: str | None = None
    width: int = 1920
    height: int = 1080
    scale: int = 2
    full_page: bool = False
    wait_ms: int = 500
    output_path: Path | None = None
    format: str = "png"
    quality: int = 90
    no_inject: bool = False
    timeout_ms: int = 30000


@dataclass
class CaptureResult:
    """The outcome of a screenshot capture.

    On success: output_path is set, error is None.
    On failure: error describes what went wrong.
    """

    output_path: Path | None = None
    url: str = ""
    season: str | None = None
    theme: str | None = None
    viewport: tuple[int, int] = (1920, 1080)
    scale: int = 2
    size_bytes: int = 0
    duration_ms: int = 0
    error: str | None = None

    @property
    def success(self) -> bool:
        """True if capture succeeded (output path exists, no error)."""
        return self.error is None and self.output_path is not None

    def to_dict(self) -> dict:
        """Convert to a JSON-serializable dictionary."""
        d = {
            "url": self.url,
            "output": str(self.output_path) if self.output_path else None,
            "season": self.season,
            "theme": self.theme,
            "viewport": {"width": self.viewport[0], "height": self.viewport[1]},
            "scale": self.scale,
            "size_bytes": self.size_bytes,
            "duration_ms": self.duration_ms,
        }
        if self.error:
            d["error"] = self.error
        return d

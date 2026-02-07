"""Tests for glimpse.capture.screenshot — dataclass contracts."""

from pathlib import Path

from glimpse.capture.screenshot import CaptureRequest, CaptureResult


class TestCaptureRequest:
    def test_defaults(self):
        """Spec defaults: 1920x1080, scale 2, wait 500, png, quality 90."""
        req = CaptureRequest(url="https://grove.place")
        assert req.width == 1920
        assert req.height == 1080
        assert req.scale == 2
        assert req.wait_ms == 500
        assert req.format == "png"
        assert req.quality == 90
        assert req.full_page is False
        assert req.no_inject is False
        assert req.timeout_ms == 30000

    def test_optional_fields_default_none(self):
        req = CaptureRequest(url="https://grove.place")
        assert req.season is None
        assert req.theme is None
        assert req.grove_mode is None
        assert req.selector is None
        assert req.output_path is None

    def test_custom_values(self):
        req = CaptureRequest(
            url="https://grove.place",
            season="autumn",
            theme="dark",
            width=1440,
            height=900,
            scale=1,
            full_page=True,
        )
        assert req.season == "autumn"
        assert req.theme == "dark"
        assert req.width == 1440
        assert req.height == 900
        assert req.scale == 1
        assert req.full_page is True


class TestCaptureResult:
    def test_success_property(self):
        result = CaptureResult(output_path=Path("/tmp/test.png"))
        assert result.success is True

    def test_failure_property(self):
        result = CaptureResult(error="Navigation failed")
        assert result.success is False

    def test_no_path_is_failure(self):
        result = CaptureResult()
        assert result.success is False

    def test_to_dict_success(self):
        result = CaptureResult(
            output_path=Path("/tmp/test.png"),
            url="https://grove.place",
            season="autumn",
            theme="dark",
            viewport=(1920, 1080),
            scale=2,
            size_bytes=1234567,
            duration_ms=3500,
        )
        d = result.to_dict()
        assert d["url"] == "https://grove.place"
        assert d["output"] == "/tmp/test.png"
        assert d["season"] == "autumn"
        assert d["theme"] == "dark"
        assert d["viewport"] == {"width": 1920, "height": 1080}
        assert d["scale"] == 2
        assert d["size_bytes"] == 1234567
        assert d["duration_ms"] == 3500
        assert "error" not in d

    def test_to_dict_error(self):
        result = CaptureResult(error="Something broke")
        d = result.to_dict()
        assert d["error"] == "Something broke"
        assert d["output"] is None

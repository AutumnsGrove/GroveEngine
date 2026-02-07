"""Tests for glimpse.output.console — output mode behavior."""

import json
from io import StringIO
from pathlib import Path
from unittest.mock import patch

from glimpse.capture.screenshot import CaptureResult
from glimpse.output.console import GlimpseOutput, _format_bytes, _display_url


class TestFormatBytes:
    def test_bytes(self):
        assert _format_bytes(500) == "500 B"

    def test_kilobytes(self):
        assert _format_bytes(2048) == "2.0 KB"

    def test_megabytes(self):
        assert _format_bytes(1_500_000) == "1.4 MB"

    def test_zero(self):
        assert _format_bytes(0) == "0 B"


class TestDisplayUrl:
    def test_strips_https(self):
        assert _display_url("https://grove.place") == "grove.place"

    def test_strips_http(self):
        assert _display_url("http://localhost:3000") == "localhost:3000"

    def test_strips_trailing_slash(self):
        assert _display_url("https://grove.place/") == "grove.place"


class TestAgentMode:
    def test_success_prints_path_only(self):
        output = GlimpseOutput(mode="agent")
        result = CaptureResult(
            output_path=Path("/tmp/test.png"),
            url="https://grove.place",
            size_bytes=1000,
        )
        with patch("sys.stdout", new_callable=StringIO) as mock_stdout:
            output.print_capture(result)
            assert mock_stdout.getvalue().strip() == "/tmp/test.png"

    def test_error_goes_to_stderr(self):
        output = GlimpseOutput(mode="agent")
        result = CaptureResult(error="Navigation failed")
        with patch("sys.stderr", new_callable=StringIO) as mock_stderr:
            output.print_capture(result)
            assert "ERROR" in mock_stderr.getvalue()
            assert "Navigation failed" in mock_stderr.getvalue()


class TestJsonMode:
    def test_success_output_is_valid_json(self):
        output = GlimpseOutput(mode="json")
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
        with patch("sys.stdout", new_callable=StringIO) as mock_stdout:
            output.print_capture(result)
            data = json.loads(mock_stdout.getvalue())
            assert data["url"] == "https://grove.place"
            assert data["season"] == "autumn"
            assert data["theme"] == "dark"
            assert data["viewport"]["width"] == 1920
            assert data["size_bytes"] == 1234567

    def test_error_output_is_valid_json(self):
        output = GlimpseOutput(mode="json")
        result = CaptureResult(error="Something broke")
        with patch("sys.stdout", new_callable=StringIO) as mock_stdout:
            output.print_capture(result)
            data = json.loads(mock_stdout.getvalue())
            assert data["error"] == "Something broke"

    def test_error_message_is_json(self):
        output = GlimpseOutput(mode="json")
        with patch("sys.stdout", new_callable=StringIO) as mock_stdout:
            output.print_error("Bad URL")
            data = json.loads(mock_stdout.getvalue())
            assert data["error"] == "Bad URL"

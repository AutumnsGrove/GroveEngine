"""Playwright-based capture engine for Glimpse.

Manages browser lifecycle and executes screenshot captures with
Grove theme injection via localStorage pre-seeding.
"""

import asyncio
import time
from pathlib import Path

from playwright.async_api import async_playwright, Browser, BrowserContext

from glimpse.capture.screenshot import CaptureRequest, CaptureResult


class CaptureEngine:
    """Manages a Playwright browser instance for screenshot captures.

    Usage as a context manager:
        async with CaptureEngine() as engine:
            result = await engine.capture(request)

    Or manual lifecycle:
        engine = CaptureEngine()
        await engine.start()
        result = await engine.capture(request)
        await engine.stop()
    """

    def __init__(self, headless: bool = True) -> None:
        self._headless = headless
        self._playwright = None
        self._browser: Browser | None = None

    async def start(self) -> None:
        """Launch the Chromium browser."""
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(
            headless=self._headless,
        )

    async def stop(self) -> None:
        """Close browser and cleanup Playwright."""
        if self._browser:
            await self._browser.close()
            self._browser = None
        if self._playwright:
            await self._playwright.stop()
            self._playwright = None

    async def __aenter__(self) -> "CaptureEngine":
        await self.start()
        return self

    async def __aexit__(self, *exc) -> None:
        await self.stop()

    async def capture(self, request: CaptureRequest) -> CaptureResult:
        """Execute a single screenshot capture.

        Steps:
        1. Create isolated browser context with viewport + scale
        2. Pre-seed localStorage if season/theme is set (avoids theme flash)
        3. Navigate to URL, wait for domcontentloaded
        4. Wait for render settle (configurable delay)
        5. Capture screenshot (full page, selector, or viewport)
        6. Save to output path, record metadata
        """
        if not self._browser:
            return CaptureResult(
                url=request.url,
                error="Browser not started. Call start() or use as context manager.",
            )

        start_time = time.monotonic()
        context: BrowserContext | None = None

        try:
            # 1. Create browser context with viewport settings
            context = await self._browser.new_context(
                viewport={"width": request.width, "height": request.height},
                device_scale_factor=request.scale,
            )

            # 2. Pre-seed localStorage for theme injection (before navigation)
            if not request.no_inject:
                init_js = _build_init_script(
                    season=request.season,
                    theme=request.theme,
                    grove_mode=request.grove_mode,
                )
                if init_js:
                    await context.add_init_script(init_js)

            page = await context.new_page()

            # 3. Navigate to URL
            try:
                await page.goto(
                    request.url,
                    wait_until="domcontentloaded",
                    timeout=request.timeout_ms,
                )
            except Exception as e:
                return CaptureResult(
                    url=request.url,
                    error=f"Navigation failed: {e}",
                )

            # 4. Wait for render settle
            if request.wait_ms > 0:
                await page.wait_for_timeout(request.wait_ms)

            # 5. Capture screenshot
            screenshot_opts = {
                "type": request.format,
            }

            if request.format == "jpeg":
                screenshot_opts["quality"] = request.quality

            output_path = request.output_path or Path("screenshot.png")

            if request.selector:
                # Element capture
                try:
                    locator = page.locator(request.selector)
                    await locator.wait_for(timeout=5000)
                    screenshot_bytes = await locator.screenshot(**screenshot_opts)
                except Exception as e:
                    return CaptureResult(
                        url=request.url,
                        season=request.season,
                        theme=request.theme,
                        viewport=(request.width, request.height),
                        scale=request.scale,
                        error=f"Selector '{request.selector}' not found: {e}",
                    )
            elif request.full_page:
                screenshot_bytes = await page.screenshot(
                    full_page=True,
                    **screenshot_opts,
                )
            else:
                screenshot_bytes = await page.screenshot(**screenshot_opts)

            # 6. Save to file
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_bytes(screenshot_bytes)

            duration_ms = int((time.monotonic() - start_time) * 1000)

            return CaptureResult(
                output_path=output_path,
                url=request.url,
                season=request.season,
                theme=request.theme,
                viewport=(request.width, request.height),
                scale=request.scale,
                size_bytes=len(screenshot_bytes),
                duration_ms=duration_ms,
            )

        except Exception as e:
            return CaptureResult(
                url=request.url,
                season=request.season,
                theme=request.theme,
                viewport=(request.width, request.height),
                scale=request.scale,
                error=f"Capture failed: {e}",
            )

        finally:
            if context:
                await context.close()


_SAFE_SEASONS = {"spring", "summer", "autumn", "winter", "midnight"}
_SAFE_THEMES = {"light", "dark", "system"}


def _build_init_script(
    season: str | None = None,
    theme: str | None = None,
    grove_mode: bool | None = None,
) -> str | None:
    """Build a JavaScript init script for localStorage pre-seeding.

    This runs before any page JavaScript, so the Svelte stores pick up
    the correct values on first read — no flash of default theme.

    Defense-in-depth: values are checked against allowlists here even though
    the CLI layer validates them too. This prevents JS injection if a caller
    bypasses validation.
    """
    statements = []

    if season:
        if season not in _SAFE_SEASONS:
            raise ValueError(f"Unsafe season value rejected: {season!r}")
        statements.append(f"localStorage.setItem('grove-season', '{season}');")

    if theme:
        if theme not in _SAFE_THEMES:
            raise ValueError(f"Unsafe theme value rejected: {theme!r}")
        statements.append(f"localStorage.setItem('theme', '{theme}');")
        # Apply dark class immediately to prevent flash
        if theme == "dark":
            statements.append("document.documentElement.classList.add('dark');")
        elif theme == "light":
            statements.append("document.documentElement.classList.remove('dark');")

    if grove_mode is not None:
        val = "true" if grove_mode else "false"
        statements.append(f"localStorage.setItem('grove-mode', '{val}');")

    if not statements:
        return None

    return "\n".join(statements)


def run_capture(request: CaptureRequest, headless: bool = True) -> CaptureResult:
    """Synchronous bridge to the async capture engine.

    Spins up a new event loop, launches a browser, captures one screenshot,
    and tears everything down. Designed for the Click command layer.
    """

    async def _run() -> CaptureResult:
        async with CaptureEngine(headless=headless) as engine:
            return await engine.capture(request)

    return asyncio.run(_run())

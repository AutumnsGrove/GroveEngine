"""glimpse install — first-time browser setup.

Wraps `playwright install chromium` with friendly messaging.
"""

import subprocess
import sys

import click


@click.command()
@click.pass_context
def install(ctx: click.Context) -> None:
    """Install Playwright's Chromium browser for captures."""
    output = ctx.obj["output"]

    output.print_info("Installing Chromium for Glimpse captures...")
    output.print_info("This only needs to happen once.\n")

    try:
        result = subprocess.run(
            [sys.executable, "-m", "playwright", "install", "chromium"],
            capture_output=False,
            text=True,
        )

        if result.returncode == 0:
            output.print_success("Chromium installed! You're ready to capture.")
        else:
            output.print_error(
                "Browser installation failed. "
                "Try running: playwright install chromium"
            )
            ctx.exit(1)

    except FileNotFoundError:
        output.print_error(
            "Playwright not found. Make sure glimpse is installed correctly."
        )
        ctx.exit(1)

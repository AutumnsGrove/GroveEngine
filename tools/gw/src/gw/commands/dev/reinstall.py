"""Reinstall UV tools command."""

import subprocess
from pathlib import Path

import click
from rich.console import Console

from ...ui import success, error, info, warning

console = Console()


@click.command()
@click.option("--tool", "-t", multiple=True, help="Specific tool to reinstall (gw, gf). Default: all")
@click.pass_context
def reinstall(ctx: click.Context, tool: tuple[str, ...]) -> None:
    """Reinstall gw/gf as global UV tools.

    After making changes to tools/gw or tools/grove-find, the global
    commands won't see your changes until you reinstall them.

    \b
    Examples:
        gw dev reinstall              # Reinstall all tools
        gw dev reinstall -t gw        # Reinstall just gw
        gw dev reinstall -t gf        # Reinstall just gf
    """
    # Find the tools directory (relative to this file's location in the repo)
    # Path: tools/gw/src/gw/commands/dev/reinstall.py
    # Go up: dev -> commands -> gw -> src -> gw (tools/gw) -> tools
    this_file = Path(__file__).resolve()
    gw_root = this_file.parent.parent.parent.parent.parent  # tools/gw
    tools_root = gw_root.parent  # tools/

    tools_to_install = {
        "gw": tools_root / "gw",
        "gf": tools_root / "grove-find",
    }

    # Filter if specific tools requested
    if tool:
        tools_to_install = {
            name: path for name, path in tools_to_install.items()
            if name in tool
        }
        if not tools_to_install:
            error(f"Unknown tool(s): {', '.join(tool)}")
            info("Available tools: gw, gf")
            ctx.exit(1)

    results = []

    for name, path in tools_to_install.items():
        if not path.exists():
            warning(f"Tool directory not found: {path}")
            results.append((name, False, "Directory not found"))
            continue

        info(f"Reinstalling {name} from {path}...")

        try:
            # Use --force and --reinstall to ensure a complete refresh
            result = subprocess.run(
                ["uv", "tool", "install", str(path), "--force", "--reinstall"],
                capture_output=True,
                text=True,
            )

            if result.returncode == 0:
                success(f"Reinstalled {name}")
                results.append((name, True, None))
            else:
                error(f"Failed to reinstall {name}: {result.stderr.strip()}")
                results.append((name, False, result.stderr.strip()))

        except FileNotFoundError:
            error("UV not found. Install it from https://docs.astral.sh/uv/")
            ctx.exit(1)
        except Exception as e:
            error(f"Failed to reinstall {name}: {e}")
            results.append((name, False, str(e)))

    # Summary
    succeeded = sum(1 for _, ok, _ in results if ok)
    failed = sum(1 for _, ok, _ in results if not ok)

    if failed == 0:
        console.print()
        success(f"All {succeeded} tool(s) reinstalled!")
        info("Run 'gw --help' or 'gf --help' to verify")
    else:
        console.print()
        warning(f"{succeeded} succeeded, {failed} failed")

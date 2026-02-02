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
    # Find the tools directory by locating the git repository root
    # This works both when running from source and from the installed tool
    tools_root = None
    found_via_git = False
    
    # Method 1: Search upward from current working directory for .git
    cwd = Path.cwd()
    current = cwd
    while current != current.parent:
        if (current / ".git").exists():
            tools_root = current / "tools"
            found_via_git = True
            break
        current = current.parent
    
    # Method 2: Fallback to relative path from __file__ if running from source
    if tools_root is None or not tools_root.exists():
        this_file = Path(__file__).resolve()
        gw_root = this_file.parent.parent.parent.parent.parent  # tools/gw
        tools_root = gw_root.parent  # tools/

    if not tools_root.exists():
        error(f"Could not find tools directory")
        info("Please run this command from within the GroveEngine repository")
        ctx.exit(1)

    # If we didn't find via git search, we're likely running from installed location
    # In that case, verify we have valid source directories (they should have pyproject.toml)
    if not found_via_git:
        gw_path = tools_root / "gw"
        gf_path = tools_root / "grove-find"
        valid_sources = (
            (gw_path.exists() and (gw_path / "pyproject.toml").exists()) or
            (gf_path.exists() and (gf_path / "pyproject.toml").exists())
        )
        if not valid_sources:
            error(f"Not running from a valid source directory")
            info(f"Current directory: {cwd}")
            info(f"Please run this command from within the GroveEngine repository")
            ctx.exit(1)

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

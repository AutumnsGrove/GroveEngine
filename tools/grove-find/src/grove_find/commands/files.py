"""File type search commands for grove-find.

Provides: gf svelte, gf ts, gf js, gf css, gf md, gf json, gf toml, gf yaml, gf html, gf shell
Also: gf test, gf config
"""

from pathlib import Path
from typing import Optional
import typer

from grove_find.core.config import get_config
from grove_find.core.tools import discover_tools, run_tool
from grove_find.output import console, print_section, print_warning

app = typer.Typer(help="File type searches")


def _run_fd(args: list[str], cwd: Path, limit: int = 50) -> str:
    """Run fd with standard options."""
    tools = discover_tools()
    if not tools.fd:
        raise typer.Exit(1)

    config = get_config()
    base_args = ["--exclude", "node_modules", "--exclude", "dist", "--exclude", ".git"]

    if config.is_human_mode:
        base_args.append("--color=always")
    else:
        base_args.append("--color=never")

    result = run_tool(tools.fd, base_args + args, cwd=cwd)
    lines = result.stdout.strip().split("\n") if result.stdout.strip() else []

    if len(lines) > limit:
        output = "\n".join(lines[:limit])
        return output + f"\n\n(Showing first {limit} results. Add a pattern to filter.)"
    return result.stdout


def _file_search(
    extension: str,
    pattern: Optional[str],
    description: str,
    excludes: Optional[list[str]] = None,
) -> None:
    """Generic file search by extension."""
    config = get_config()

    if pattern:
        print_section(f"{description} matching: {pattern}", "")
    else:
        print_section(description, "")

    args = ["-e", extension]

    # Add any additional exclusions
    if excludes:
        for exc in excludes:
            args.extend(["--exclude", exc])

    if pattern:
        args.append(pattern)
    else:
        args.append(".")

    args.append(str(config.grove_root))

    output = _run_fd(args, cwd=config.grove_root)
    if output:
        console.print_raw(output.rstrip())
    else:
        print_warning("No files found")


def svelte_command(pattern: Optional[str] = None) -> None:
    """Find Svelte component files."""
    _file_search("svelte", pattern, "Svelte components")


@app.command("svelte")
def svelte_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Filter pattern"),
) -> None:
    """Find Svelte component files."""
    svelte_command(pattern)


def ts_command(pattern: Optional[str] = None) -> None:
    """Find TypeScript files."""
    _file_search("ts", pattern, "TypeScript files", excludes=["*.d.ts"])


@app.command("ts")
def ts_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Filter pattern"),
) -> None:
    """Find TypeScript files."""
    ts_command(pattern)


def js_command(pattern: Optional[str] = None) -> None:
    """Find JavaScript files."""
    _file_search("js", pattern, "JavaScript files", excludes=["*.min.js"])


@app.command("js")
def js_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Filter pattern"),
) -> None:
    """Find JavaScript files."""
    js_command(pattern)


def css_command(pattern: Optional[str] = None) -> None:
    """Find CSS files."""
    _file_search("css", pattern, "CSS files", excludes=["*.min.css"])


@app.command("css")
def css_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Filter pattern"),
) -> None:
    """Find CSS files."""
    css_command(pattern)


def md_command(pattern: Optional[str] = None) -> None:
    """Find Markdown files."""
    _file_search("md", pattern, "Markdown files")


@app.command("md")
def md_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Filter pattern"),
) -> None:
    """Find Markdown files."""
    md_command(pattern)


def json_command(pattern: Optional[str] = None) -> None:
    """Find JSON files."""
    _file_search("json", pattern, "JSON files", excludes=["package-lock.json"])


@app.command("json")
def json_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Filter pattern"),
) -> None:
    """Find JSON files."""
    json_command(pattern)


def toml_command(pattern: Optional[str] = None) -> None:
    """Find TOML files."""
    _file_search("toml", pattern, "TOML files")


@app.command("toml")
def toml_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Filter pattern"),
) -> None:
    """Find TOML files."""
    toml_command(pattern)


def yaml_command(pattern: Optional[str] = None) -> None:
    """Find YAML files."""
    config = get_config()

    if pattern:
        print_section(f"YAML files matching: {pattern}", "")
    else:
        print_section("YAML files", "")

    tools = discover_tools()
    if not tools.fd:
        raise typer.Exit(1)

    base_args = ["--exclude", "node_modules", "--exclude", "dist", "--exclude", ".git"]
    if config.is_human_mode:
        base_args.append("--color=always")
    else:
        base_args.append("--color=never")

    # fd supports multiple extensions
    args = base_args + ["-e", "yml", "-e", "yaml"]

    if pattern:
        args.append(pattern)
    else:
        args.append(".")

    args.append(str(config.grove_root))

    result = run_tool(tools.fd, args, cwd=config.grove_root)
    if result.stdout:
        console.print_raw(result.stdout.rstrip())
    else:
        print_warning("No files found")


@app.command("yaml")
def yaml_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Filter pattern"),
) -> None:
    """Find YAML files."""
    yaml_command(pattern)


def html_command(pattern: Optional[str] = None) -> None:
    """Find HTML files."""
    _file_search("html", pattern, "HTML files")


@app.command("html")
def html_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Filter pattern"),
) -> None:
    """Find HTML files."""
    html_command(pattern)


def shell_command(pattern: Optional[str] = None) -> None:
    """Find shell script files."""
    config = get_config()

    if pattern:
        print_section(f"Shell scripts matching: {pattern}", "")
    else:
        print_section("Shell scripts", "")

    tools = discover_tools()
    if not tools.fd:
        raise typer.Exit(1)

    base_args = ["--exclude", "node_modules", "--exclude", "dist", "--exclude", ".git"]
    if config.is_human_mode:
        base_args.append("--color=always")
    else:
        base_args.append("--color=never")

    args = base_args + ["-e", "sh", "-e", "bash", "-e", "zsh"]

    if pattern:
        args.append(pattern)
    else:
        args.append(".")

    args.append(str(config.grove_root))

    result = run_tool(tools.fd, args, cwd=config.grove_root)
    if result.stdout:
        console.print_raw(result.stdout.rstrip())
    else:
        print_warning("No files found")


@app.command("shell")
def shell_cmd(
    pattern: Optional[str] = typer.Argument(None, help="Filter pattern"),
) -> None:
    """Find shell script files."""
    shell_command(pattern)


def test_command(name: Optional[str] = None) -> None:
    """Find test files."""
    config = get_config()

    if name:
        print_section(f"Test files matching: {name}", "")
    else:
        print_section("Test files", "")

    tools = discover_tools()
    if not tools.fd:
        raise typer.Exit(1)

    base_args = ["--exclude", "node_modules", "--exclude", "dist", "--exclude", ".git"]
    if config.is_human_mode:
        base_args.append("--color=always")
    else:
        base_args.append("--color=never")

    # Match .test.ts, .spec.ts, .test.js, .spec.js
    args = base_args + [r"\.(test|spec)\.(ts|js)$"]

    args.append(str(config.grove_root))

    result = run_tool(tools.fd, args, cwd=config.grove_root)
    output = result.stdout.strip()

    if name and output:
        # Filter by name
        lines = [line for line in output.split("\n") if name.lower() in line.lower()]
        if lines:
            console.print_raw("\n".join(lines[:30]))
        else:
            print_warning("No matching test files found")
    elif output:
        lines = output.split("\n")
        console.print_raw("\n".join(lines[:30]))
        if len(lines) > 30:
            console.print(f"\n(Showing first 30 of {len(lines)} test files)")
    else:
        print_warning("No test files found")

    # Also show test directories
    print_section("Test Directories", "")
    dir_args = base_args + ["-t", "d", r"test|tests|__tests__", str(config.grove_root)]
    result = run_tool(tools.fd, dir_args, cwd=config.grove_root)
    if result.stdout:
        lines = result.stdout.strip().split("\n")
        console.print_raw("\n".join(lines[:20]))
    else:
        console.print("  (no test directories found)")


@app.command("test")
def test_cmd(
    name: Optional[str] = typer.Argument(None, help="Test file name filter"),
) -> None:
    """Find test files."""
    test_command(name)


def config_command(name: Optional[str] = None) -> None:
    """Find configuration files."""
    config = get_config()

    if name:
        print_section(f"Configuration files matching: {name}", "")
    else:
        print_section("Configuration files", "")

    tools = discover_tools()
    if not tools.fd:
        raise typer.Exit(1)

    base_args = ["--exclude", "node_modules", "--exclude", "dist", "--exclude", ".git"]
    if config.is_human_mode:
        base_args.append("--color=always")
    else:
        base_args.append("--color=never")

    if name:
        # Search for specific config
        args = base_args + [name, str(config.grove_root)]
        result = run_tool(tools.fd, args, cwd=config.grove_root)
        if result.stdout:
            # Filter for config-like files
            lines = [
                line
                for line in result.stdout.strip().split("\n")
                if any(
                    kw in line.lower()
                    for kw in ["config", "rc", ".toml", ".json", ".yaml", ".yml"]
                )
            ]
            if lines:
                console.print_raw("\n".join(lines))
            else:
                print_warning("No matching config files found")
        else:
            print_warning("No matching config files found")
    else:
        # Show categorized config files
        print_section("Build & Bundler Configs", "")
        pattern = (
            r"(vite|svelte|tailwind|postcss|tsconfig|jsconfig)\.config\.(js|ts|mjs)"
        )
        result = run_tool(
            tools.fd,
            base_args + [pattern, str(config.grove_root)],
            cwd=config.grove_root,
        )
        if result.stdout:
            console.print_raw(result.stdout.rstrip())
        else:
            console.print("  (none found)")

        print_section("Wrangler Configs", "")
        result = run_tool(
            tools.fd,
            base_args + ["-e", "toml", "wrangler", str(config.grove_root)],
            cwd=config.grove_root,
        )
        if result.stdout:
            console.print_raw(result.stdout.rstrip())
        else:
            console.print("  (none found)")

        print_section("Package Configs", "")
        result = run_tool(
            tools.fd,
            base_args + ["package.json", str(config.grove_root)],
            cwd=config.grove_root,
        )
        if result.stdout:
            lines = result.stdout.strip().split("\n")
            console.print_raw("\n".join(lines[:20]))
        else:
            console.print("  (none found)")

        print_section("TypeScript Configs", "")
        result = run_tool(
            tools.fd,
            base_args + ["-e", "json", "tsconfig", str(config.grove_root)],
            cwd=config.grove_root,
        )
        if result.stdout:
            console.print_raw(result.stdout.rstrip())
        else:
            console.print("  (none found)")


@app.command("config")
def config_cmd(
    name: Optional[str] = typer.Argument(None, help="Config file name filter"),
) -> None:
    """Find configuration files."""
    config_command(name)

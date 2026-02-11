"""Git remote management commands."""

import json
from typing import Optional

import click
from rich.console import Console
from rich.table import Table

from ...git_wrapper import Git, GitError
from ...safety.git import GitSafetyError, check_git_safety

console = Console()


@click.group()
def remote() -> None:
    """Manage remote repositories.

    View, add, and remove remote connections. List and show are
    always safe; add/remove/rename require --write.

    \b
    Examples:
        gw git remote list                          # List remotes
        gw git remote show origin                   # Show remote details
        gw git remote add --write upstream <url>    # Add remote
        gw git remote remove --write old-remote     # Remove remote
        gw git remote rename --write old new        # Rename remote
    """
    pass


@remote.command("list")
@click.pass_context
def remote_list(ctx: click.Context) -> None:
    """List all remotes with their URLs.

    Always safe - no --write flag required.

    \b
    Examples:
        gw git remote list
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        git = Git()

        if not git.is_repo():
            console.print("[red]Not a git repository[/red]")
            raise SystemExit(1)

        output = git.execute(["remote", "-v"])

        if not output.strip():
            if output_json:
                console.print(json.dumps({"remotes": []}))
            else:
                console.print("[dim]No remotes configured[/dim]")
            return

        # Parse remote -v output: "name\turl (fetch/push)"
        remotes = {}
        for line in output.strip().split("\n"):
            if not line.strip():
                continue
            parts = line.split("\t")
            if len(parts) >= 2:
                name = parts[0]
                url_and_type = parts[1]
                url = url_and_type.rsplit(" ", 1)[0]
                if name not in remotes:
                    remotes[name] = url

        if output_json:
            data = [{"name": n, "url": u} for n, u in remotes.items()]
            console.print(json.dumps({"remotes": data}, indent=2))
            return

        table = Table(title="Remotes", border_style="green")
        table.add_column("Name", style="cyan")
        table.add_column("URL")

        for name, url in remotes.items():
            table.add_row(name, url)

        console.print(table)

    except GitError as e:
        console.print(f"[red]Git error:[/red] {e.message}")
        raise SystemExit(1)


@remote.command("show")
@click.argument("name", default="origin")
@click.pass_context
def remote_show(ctx: click.Context, name: str) -> None:
    """Show details about a remote.

    Always safe - no --write flag required.

    \b
    Examples:
        gw git remote show origin
        gw git remote show upstream
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        git = Git()

        if not git.is_repo():
            console.print("[red]Not a git repository[/red]")
            raise SystemExit(1)

        output = git.execute(["remote", "show", name])

        if output_json:
            console.print(json.dumps({"remote": name, "details": output.strip()}))
        else:
            console.print(output)

    except GitError as e:
        console.print(f"[red]Git error:[/red] {e.message}")
        raise SystemExit(1)


@remote.command("add")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.argument("name")
@click.argument("url")
@click.pass_context
def remote_add(ctx: click.Context, write: bool, name: str, url: str) -> None:
    """Add a new remote.

    Requires --write flag.

    \b
    Examples:
        gw git remote add --write upstream https://github.com/org/repo.git
        gw git remote add --write fork git@github.com:user/repo.git
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_git_safety("remote_add", write_flag=write)
    except GitSafetyError as e:
        console.print(f"[red]Safety check failed:[/red] {e.message}")
        if e.suggestion:
            console.print(f"[dim]{e.suggestion}[/dim]")
        raise SystemExit(1)

    try:
        git = Git()

        if not git.is_repo():
            console.print("[red]Not a git repository[/red]")
            raise SystemExit(1)

        git.execute(["remote", "add", name, url])

        if output_json:
            console.print(json.dumps({"added": name, "url": url}))
        else:
            console.print(f"[green]Added remote:[/green] {name} → {url}")

    except GitError as e:
        console.print(f"[red]Git error:[/red] {e.message}")
        raise SystemExit(1)


@remote.command("remove")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.argument("name")
@click.pass_context
def remote_remove(ctx: click.Context, write: bool, name: str) -> None:
    """Remove a remote.

    Requires --write flag.

    \b
    Examples:
        gw git remote remove --write old-remote
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_git_safety("remote_remove", write_flag=write)
    except GitSafetyError as e:
        console.print(f"[red]Safety check failed:[/red] {e.message}")
        if e.suggestion:
            console.print(f"[dim]{e.suggestion}[/dim]")
        raise SystemExit(1)

    try:
        git = Git()

        if not git.is_repo():
            console.print("[red]Not a git repository[/red]")
            raise SystemExit(1)

        git.execute(["remote", "remove", name])

        if output_json:
            console.print(json.dumps({"removed": name}))
        else:
            console.print(f"[green]Removed remote:[/green] {name}")

    except GitError as e:
        console.print(f"[red]Git error:[/red] {e.message}")
        raise SystemExit(1)


@remote.command("rename")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.argument("old_name")
@click.argument("new_name")
@click.pass_context
def remote_rename(ctx: click.Context, write: bool, old_name: str, new_name: str) -> None:
    """Rename a remote.

    Requires --write flag.

    \b
    Examples:
        gw git remote rename --write origin upstream
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_git_safety("remote_rename", write_flag=write)
    except GitSafetyError as e:
        console.print(f"[red]Safety check failed:[/red] {e.message}")
        if e.suggestion:
            console.print(f"[dim]{e.suggestion}[/dim]")
        raise SystemExit(1)

    try:
        git = Git()

        if not git.is_repo():
            console.print("[red]Not a git repository[/red]")
            raise SystemExit(1)

        git.execute(["remote", "rename", old_name, new_name])

        if output_json:
            console.print(json.dumps({"renamed": old_name, "to": new_name}))
        else:
            console.print(f"[green]Renamed remote:[/green] {old_name} → {new_name}")

    except GitError as e:
        console.print(f"[red]Git error:[/red] {e.message}")
        raise SystemExit(1)

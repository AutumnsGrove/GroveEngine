"""Workflow run commands for GitHub integration."""

import json
from typing import Optional

import click
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm
from rich.table import Table

from ...gh_wrapper import GitHub, GitHubError
from ...ui import is_interactive
from ...safety.github import (
    GitHubSafetyError,
    check_github_safety,
    check_rate_limit,
    should_warn_rate_limit,
)

console = Console()


@click.group()
def run() -> None:
    """Workflow run operations.

    \b
    Examples:
        gw gh run list              # List recent runs
        gw gh run view 12345678     # View run details
        gw gh run rerun --write ID  # Rerun failed jobs
    """
    pass


@run.command("list")
@click.option("--workflow", "-w", help="Filter by workflow file name")
@click.option("--branch", "-b", help="Filter by branch")
@click.option("--status", "-s", help="Filter by status (queued, in_progress, completed)")
@click.option("--limit", default=20, help="Maximum number to return")
@click.pass_context
def run_list(
    ctx: click.Context,
    workflow: Optional[str],
    branch: Optional[str],
    status: Optional[str],
    limit: int,
) -> None:
    """List workflow runs.

    Always safe - no --write flag required.

    \b
    Examples:
        gw gh run list
        gw gh run list --workflow ci.yml
        gw gh run list --branch main --limit 10
        gw gh run list --status failure
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        gh = GitHub()

        # Check rate limit
        rate = check_rate_limit(gh)
        if rate and should_warn_rate_limit(rate) and not output_json:
            console.print(
                f"[yellow]Rate limit warning:[/yellow] {rate.remaining} requests remaining"
            )

        runs = gh.run_list(
            workflow=workflow,
            branch=branch,
            status=status,
            limit=limit,
        )

        if output_json:
            data = [
                {
                    "id": run.id,
                    "name": run.name,
                    "status": run.status,
                    "conclusion": run.conclusion,
                    "workflow": run.workflow_name,
                    "branch": run.branch,
                    "event": run.event,
                }
                for run in runs
            ]
            console.print(json.dumps(data, indent=2))
            return

        if not runs:
            console.print("[dim]No workflow runs found[/dim]")
            return

        table = Table(title="Workflow Runs", border_style="green")
        table.add_column("ID", style="cyan", width=12)
        table.add_column("Workflow")
        table.add_column("Branch", style="dim")
        table.add_column("Status")
        table.add_column("Conclusion")

        for run in runs:
            # Color code status/conclusion
            status_style = {
                "queued": "yellow",
                "in_progress": "blue",
                "completed": "green",
            }.get(run.status.lower(), "white")

            conclusion_style = {
                "success": "green",
                "failure": "red",
                "cancelled": "yellow",
                "skipped": "dim",
            }.get((run.conclusion or "").lower(), "white")

            conclusion_text = run.conclusion or "-"

            table.add_row(
                str(run.id),
                run.workflow_name or run.name,
                run.branch,
                f"[{status_style}]{run.status}[/{status_style}]",
                f"[{conclusion_style}]{conclusion_text}[/{conclusion_style}]",
            )

        console.print(table)

    except GitHubError as e:
        console.print(f"[red]GitHub error:[/red] {e.message}")
        raise SystemExit(1)


@run.command("view")
@click.argument("run_id", type=int)
@click.option("--log", is_flag=True, help="Show full logs")
@click.option("--log-failed", is_flag=True, help="Show only failed job logs")
@click.option("--no-logs", is_flag=True, help="Skip auto-fetching failure logs")
@click.pass_context
def run_view(
    ctx: click.Context,
    run_id: int,
    log: bool,
    log_failed: bool,
    no_logs: bool,
) -> None:
    """View workflow run details with job breakdown.

    Shows all jobs and their status. When a run has failures,
    automatically fetches and displays failed job logs unless
    --no-logs is passed.

    \b
    Examples:
        gw gh run view 12345678
        gw gh run view 12345678 --log
        gw gh run view 12345678 --no-logs
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        gh = GitHub()
        run = gh.run_view_with_jobs(run_id)

        if output_json:
            data = {
                "id": run.id,
                "name": run.name,
                "status": run.status,
                "conclusion": run.conclusion,
                "workflow": run.workflow_name,
                "branch": run.branch,
                "event": run.event,
                "created_at": run.created_at,
                "url": run.url,
                "jobs": [
                    {
                        "name": j.name,
                        "status": j.status,
                        "conclusion": j.conclusion,
                        "failed_steps": [
                            s.name for s in j.steps
                            if s.conclusion == "failure"
                        ],
                    }
                    for j in (run.jobs or [])
                ],
            }
            console.print(json.dumps(data, indent=2))
            return

        # Color code conclusion
        conclusion_style = {
            "success": "green",
            "failure": "red",
            "cancelled": "yellow",
        }.get((run.conclusion or "").lower(), "white")

        conclusion_text = run.conclusion or run.status

        console.print(Panel(
            f"[bold]{run.workflow_name}[/bold] - {run.name}\n\n"
            f"Status: [{conclusion_style}]{conclusion_text}[/{conclusion_style}]\n"
            f"Branch: [cyan]{run.branch}[/cyan]\n"
            f"Event: {run.event}\n"
            f"Created: {run.created_at}\n"
            f"URL: {run.url}",
            title=f"Run #{run.id}",
            border_style="green",
        ))

        # Show job breakdown
        has_failures = False
        if run.jobs:
            job_table = Table(border_style="dim")
            job_table.add_column("Job", style="white")
            job_table.add_column("Status")
            job_table.add_column("Failed Step", style="dim")

            for job in run.jobs:
                job_conclusion = job.conclusion or job.status
                job_style = {
                    "success": "green",
                    "failure": "red",
                    "cancelled": "yellow",
                    "skipped": "dim",
                }.get(job_conclusion.lower(), "white")

                # Find failed steps
                failed_steps = [
                    s.name for s in job.steps
                    if s.conclusion == "failure"
                ]

                if job_conclusion.lower() == "failure":
                    has_failures = True

                job_table.add_row(
                    job.name,
                    f"[{job_style}]{job_conclusion}[/{job_style}]",
                    ", ".join(failed_steps) if failed_steps else "",
                )

            console.print()
            console.print(job_table)

        # Auto-fetch failure logs when run failed (unless --no-logs)
        show_failed_logs = (
            log_failed
            or (has_failures and not no_logs and not log)
        )

        if log or show_failed_logs:
            log_type = "failed" if show_failed_logs else "full"
            console.print(f"\n[dim]Fetching {log_type} logs...[/dim]\n")
            try:
                if show_failed_logs:
                    log_output = gh.run_failed_logs(run_id)
                else:
                    args = ["run", "view", str(run_id), "--repo", gh.repo, "--log"]
                    log_output = gh.execute(args, use_json=False)

                if log_output.strip():
                    # Truncate very long logs to last 60 lines
                    lines = log_output.strip().splitlines()
                    if len(lines) > 60 and not log:
                        console.print(f"[dim]... ({len(lines) - 60} lines truncated, use --log for full output)[/dim]\n")
                        log_output = "\n".join(lines[-60:])
                    console.print(log_output)
                else:
                    console.print("[dim]No failure logs available[/dim]")
            except GitHubError:
                console.print("[dim]Could not fetch logs[/dim]")

    except GitHubError as e:
        console.print(f"[red]GitHub error:[/red] {e.message}")
        raise SystemExit(1)


@run.command("watch")
@click.argument("run_id", type=int)
@click.pass_context
def run_watch(ctx: click.Context, run_id: int) -> None:
    """Watch a workflow run in progress.

    Always safe - no --write flag required. Blocks until complete.

    \b
    Examples:
        gw gh run watch 12345678
    """
    try:
        gh = GitHub()
        console.print(f"[dim]Watching run {run_id}...[/dim]")
        gh.run_watch(run_id)

    except GitHubError as e:
        console.print(f"[red]GitHub error:[/red] {e.message}")
        raise SystemExit(1)


@run.command("rerun")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.argument("run_id", type=int)
@click.option("--failed", is_flag=True, help="Only rerun failed jobs")
@click.pass_context
def run_rerun(
    ctx: click.Context,
    write: bool,
    run_id: int,
    failed: bool,
) -> None:
    """Rerun a workflow.

    Requires --write flag.

    \b
    Examples:
        gw gh run rerun --write 12345678
        gw gh run rerun --write 12345678 --failed
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_github_safety("run_rerun", write_flag=write)
    except GitHubSafetyError as e:
        console.print(f"[red]Safety check failed:[/red] {e.message}")
        if e.suggestion:
            console.print(f"[dim]{e.suggestion}[/dim]")
        raise SystemExit(1)

    try:
        gh = GitHub()
        gh.run_rerun(run_id, failed_only=failed)

        if output_json:
            console.print(json.dumps({
                "rerun": run_id,
                "failed_only": failed,
            }))
        else:
            if failed:
                console.print(f"[green]Rerunning failed jobs for run {run_id}[/green]")
            else:
                console.print(f"[green]Rerunning all jobs for run {run_id}[/green]")

    except GitHubError as e:
        console.print(f"[red]GitHub error:[/red] {e.message}")
        raise SystemExit(1)


@run.command("cancel")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.argument("run_id", type=int)
@click.pass_context
def run_cancel(
    ctx: click.Context,
    write: bool,
    run_id: int,
) -> None:
    """Cancel a workflow run.

    Requires --write flag.

    \b
    Examples:
        gw gh run cancel --write 12345678
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_github_safety("run_cancel", write_flag=write)
    except GitHubSafetyError as e:
        console.print(f"[red]Safety check failed:[/red] {e.message}")
        if e.suggestion:
            console.print(f"[dim]{e.suggestion}[/dim]")
        raise SystemExit(1)

    # Confirm if interactive
    if not output_json and is_interactive():
        if not Confirm.ask(f"Cancel run {run_id}?", default=True):
            console.print("[dim]Aborted[/dim]")
            raise SystemExit(0)

    try:
        gh = GitHub()
        gh.run_cancel(run_id)

        if output_json:
            console.print(json.dumps({"cancelled": run_id}))
        else:
            console.print(f"[green]Cancelled run {run_id}[/green]")

    except GitHubError as e:
        console.print(f"[red]GitHub error:[/red] {e.message}")
        raise SystemExit(1)

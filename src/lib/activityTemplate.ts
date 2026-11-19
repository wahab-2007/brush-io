export default String.raw`#!/usr/bin/env python3
"""Create the specified additional commits in a clean Git repository.

Use --dry-run to review, --apply to commit and --push to push a completed plan.
Times default to 00:00 UTC. Use the same --hour and --minute when resuming.
Keep this script outside the target working tree and run it from that tree.
"""

import argparse
from datetime import date, datetime, time, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys


PLAN = __CONTRIBUTION_PLAN__
PLAN_ID = hashlib.sha256(json.dumps(PLAN, separators=(",", ":")).encode()).hexdigest()[:24]
ACTIVITY = ".brush-io-activity-" + PLAN_ID + ".log"


class PlanError(Exception):
    pass


def git(*args, env=None, optional=False):
    result = subprocess.run(
        ["git", *args], stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        text=True, encoding="utf-8", errors="replace", env=env, check=False,
    )
    if result.returncode:
        if optional:
            return None
        raise PlanError("git " + args[0] + " failed: " + (result.stderr.strip() or result.stdout.strip()))
    return result.stdout.rstrip("\r\n")


def operations(hour, minute):
    for day, count in PLAN:
        stamp = datetime.combine(date.fromisoformat(day), time(hour, minute), timezone.utc)
        for _ in range(count):
            yield stamp


def subject(index):
    return f"Brush IO {PLAN_ID} activity {index}"


def activity_contents(index, stamp):
    return f"Brush IO plan {PLAN_ID}\nOperation {index}\nDate {stamp.date().isoformat()} UTC\n"


def checked_progress(hour, minute):
    rows = git("log", "--no-merges", "--reverse", "--format=%H%x09%aI%x09%cI%x09%s",
               "HEAD", "--", ACTIVITY, optional=True) or ""
    other_refs = git("log", "--all", "--no-merges", "--format=%H", "--", ACTIVITY) or ""
    commits = set()
    expected_file = None
    remaining = operations(hour, minute)
    for index, row in enumerate(rows.splitlines(), 1):
        stamp = next(remaining, None)
        fields = row.split("\t", 3)
        if (stamp is None or len(fields) != 4 or any(value.replace("Z", "+00:00") != stamp.isoformat() for value in fields[1:3])
                or fields[3] != subject(index)):
            raise PlanError("The activity history does not match this plan and UTC time.")
        commits.add(fields[0])
        expected_file = activity_contents(index, stamp)

    if set(other_refs.splitlines()) - commits:
        raise PlanError("This plan already has commits outside the current branch. Select the branch with its most recent commits.")
    path = Path(ACTIVITY)
    if path.is_symlink() or (path.exists() and not path.is_file()):
        raise PlanError("The activity path is occupied by another file type.")
    if expected_file is None:
        if path.exists():
            raise PlanError("The activity path already exists without matching generated history.")
    elif not path.is_file() or path.read_text(encoding="utf-8") != expected_file:
        raise PlanError("The activity file does not match the generated history.")
    return len(commits)


def validate_repo():
    if not shutil.which("git"):
        raise PlanError("Install Git and make it available on PATH.")
    if git("rev-parse", "--is-inside-work-tree", optional=True) != "true":
        raise PlanError("Run this script from an existing Git working tree.")
    root = Path(git("rev-parse", "--show-toplevel")).resolve()
    os.chdir(root)
    branch = git("symbolic-ref", "--quiet", "--short", "HEAD", optional=True)
    if not branch:
        raise PlanError("Check out a branch before running this script.")
    if not git("rev-parse", "--verify", "HEAD^{commit}", optional=True):
        raise PlanError("Create the repository’s initial commit before running this script.")
    if git("status", "--porcelain", "--untracked-files=all"):
        raise PlanError("The working tree has uncommitted changes. Keep this script outside it and make the tree clean.")
    git_dir = Path(git("rev-parse", "--absolute-git-dir"))
    for state in ("MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "rebase-merge", "rebase-apply", "sequencer", "BISECT_START"):
        if (git_dir / state).exists():
            raise PlanError("Finish the active Git operation before running this script.")
    return root, branch


def confirm(prompt, yes):
    if yes:
        return
    try:
        if input(prompt + " [y/N] ").strip().lower() == "y":
            return
    except EOFError:
        pass
    raise PlanError("Cancelled.")


def apply_plan(branch, completed, total, hour, minute, name, email):
    path = Path(ACTIVITY)
    prior = path.read_text(encoding="utf-8") if completed else None
    head = git("rev-parse", "HEAD")
    for index, stamp in enumerate(operations(hour, minute), 1):
        if index <= completed:
            continue
        if stamp > datetime.now(timezone.utc):
            raise PlanError("The selected UTC time is in the future.")
        if git("symbolic-ref", "--quiet", "--short", "HEAD", optional=True) != branch or git("rev-parse", "HEAD") != head:
            raise PlanError("The branch changed during the run. Inspect Git history before resuming.")
        if path.is_symlink() or (prior is not None and path.read_text(encoding="utf-8") != prior):
            raise PlanError("The activity file changed during the run.")
        content = activity_contents(index, stamp)
        with path.open("x" if prior is None else "w", encoding="utf-8", newline="\n") as handle:
            handle.write(content)
        git("add", "--", ACTIVITY)
        env = os.environ.copy()
        for role in ("AUTHOR", "COMMITTER"):
            env["GIT_" + role + "_NAME"] = name
            env["GIT_" + role + "_EMAIL"] = email
            env["GIT_" + role + "_DATE"] = stamp.isoformat()
        try:
            git("commit", "--only", "-m", subject(index), "--", ACTIVITY, env=env)
            head = git("rev-parse", "HEAD")
        except PlanError as error:
            raise PlanError(f"{error}\nInspect git status and git log before resuming. Completed commits are preserved.") from error
        prior = content
        print(f"[{index}/{total}] {stamp.date()} {head[:12]}", flush=True)


def run():
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group()
    action.add_argument("--dry-run", action="store_true", help="review planned changes (default)")
    action.add_argument("--apply", action="store_true", help="create local Git commits")
    action.add_argument("--push", action="store_true", help="push the current branch after the plan is complete")
    parser.add_argument("--yes", action="store_true", help="skip interactive confirmation")
    parser.add_argument("--remote", default="origin", help="remote name for --push (default: origin)")
    parser.add_argument("--default-branch", help="expected GitHub default branch")
    parser.add_argument("--hour", type=int, choices=range(24), default=0, metavar="0-23", help="UTC commit hour (default: 0)")
    parser.add_argument("--minute", type=int, choices=range(60), default=0, metavar="0-59", help="UTC commit minute (default: 0)")
    args = parser.parse_args()

    if not PLAN:
        print("No additional commits requested.")
        return
    root, branch = validate_repo()
    if args.remote.startswith("-") or not args.remote:
        raise PlanError("Specify a valid Git remote name.")
    expected = args.default_branch
    if not expected:
        remote_head = git("symbolic-ref", "--quiet", f"refs/remotes/{args.remote}/HEAD", optional=True)
        prefix = f"refs/remotes/{args.remote}/"
        expected = remote_head[len(prefix):] if remote_head and remote_head.startswith(prefix) else "main"
    if branch != expected:
        print(f"Warning: current branch is {branch}, expected default branch is {expected}. Verify GitHub contribution eligibility.", file=sys.stderr)
    total = sum(count for _, count in PLAN)
    now = datetime.now(timezone.utc)
    last = datetime.combine(date.fromisoformat(PLAN[-1][0]), time(args.hour, args.minute), timezone.utc)
    if last > now:
        raise PlanError("The latest requested commit timestamp is in the future. Choose an earlier UTC time or try again later.")
    common_dir = Path(git("rev-parse", "--path-format=absolute", "--git-common-dir"))
    lock = common_dir / ("brush-io-" + PLAN_ID + ".lock")
    if args.apply or args.push:
        try:
            lock.mkdir()
        except FileExistsError:
            raise PlanError("This plan is already running. If a previous process stopped, check that it has exited before removing " + str(lock))
    try:
        completed = checked_progress(args.hour, args.minute)
        print(f"Repository: {root}\nBranch: {branch}\nDates: {PLAN[0][0]} through {PLAN[-1][0]}")
        print(f"Time: {args.hour:02d}:{args.minute:02d} UTC\nNew commits: {total - completed} ({completed} of {total} already created)")
        if args.push:
            if completed != total:
                raise PlanError("Apply the complete plan locally before pushing.")
            if args.remote not in git("remote").splitlines():
                raise PlanError("That Git remote does not exist.")
            confirm(f"Push completed branch {branch} to {args.remote}?", args.yes)
            ref = "refs/heads/" + branch
            output = git("push", "--no-force", "--no-follow-tags", "--recurse-submodules=no", "--", args.remote, ref + ":" + ref)
            print(output or f"Pushed {branch} to {args.remote}.")
        elif args.apply:
            if completed == total:
                return
            name = git("config", "--get", "user.name", optional=True)
            email = git("config", "--get", "user.email", optional=True)
            if not name or not email or "@" not in email:
                raise PlanError("Set Git user.name and user.email in this repository first.")
            print(f"Git author: {name} <{email}>. Confirm this email is associated with your GitHub account.")
            confirm(f"Create {total - completed} local commits on {branch}?", args.yes)
            apply_plan(branch, completed, total, args.hour, args.minute, name, email)
            if checked_progress(args.hour, args.minute) != total:
                raise PlanError("The generated history did not match the plan. Inspect git log before resuming.")
            print("Local commits created. Use --push separately to publish them.")
        else:
            skip = completed
            for day, count in PLAN:
                already = min(skip, count)
                skip -= already
                print(f"{day}  {count - already} new  {already} already created")
    finally:
        if args.apply or args.push:
            lock.rmdir()


if __name__ == "__main__":
    try:
        run()
    except (PlanError, OSError, ValueError) as error:
        print(f"Error: {error}", file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nInterrupted. Inspect git status before resuming.", file=sys.stderr)
        sys.exit(130)
`

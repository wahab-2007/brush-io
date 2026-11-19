"""Exercise the generated script against temporary local repositories."""

import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


SCRIPT = Path(sys.argv.pop(1)).resolve()
FUTURE_SCRIPT = Path(sys.argv.pop(1)).resolve()


class ActivityScriptTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name)
        self.env = {
            key: value for key, value in os.environ.items()
            if not key.startswith(("GIT_AUTHOR_", "GIT_COMMITTER_", "GIT_CONFIG_"))
        }
        self.env.update(
            GIT_CONFIG_NOSYSTEM="1",
            GIT_CONFIG_GLOBAL=os.devnull,
            GIT_TERMINAL_PROMPT="0",
        )
        self.git("init", "--initial-branch=main")
        self.git("config", "user.name", "Local Integration Test")
        self.git("config", "user.email", "integration@example.invalid")
        self.seed = self.repo / "seed.txt"
        self.seed.write_text("untouched", encoding="utf-8")
        self.git("add", "seed.txt")
        self.git("commit", "-m", "Initial commit")
        self.initial = self.git("rev-parse", "HEAD")
        self.git("branch", "unrelated")

    def git(self, *args):
        return subprocess.check_output(
            ["git", *args], cwd=self.repo, env=self.env, text=True, stderr=subprocess.PIPE
        ).strip()

    def script(self, *args, file=SCRIPT, input_text=None):
        return subprocess.run(
            [sys.executable, str(file), *args], cwd=self.repo, env=self.env,
            text=True, capture_output=True, input=input_text, check=False,
        )

    def test_dry_run_apply_idempotence_dates_and_history(self):
        dry = self.script("--dry-run", "--hour", "9", "--minute", "15")
        self.assertEqual(dry.returncode, 0, dry.stderr)
        self.assertIn("New commits: 3", dry.stdout)
        self.assertEqual(self.git("rev-parse", "HEAD"), self.initial)

        cancelled = self.script("--apply", input_text="n\n")
        self.assertNotEqual(cancelled.returncode, 0)
        self.assertEqual(self.git("rev-parse", "HEAD"), self.initial)

        applied = self.script("--apply", "--yes", "--hour", "9", "--minute", "15")
        self.assertEqual(applied.returncode, 0, applied.stderr)
        self.assertIn("[3/3]", applied.stdout)
        latest = self.git("rev-parse", "HEAD")
        self.assertEqual(self.git("rev-list", "--count", f"{self.initial}..HEAD"), "3")
        self.assertEqual(self.git("rev-parse", "unrelated"), self.initial)
        self.assertEqual(self.seed.read_text(encoding="utf-8"), "untouched")
        self.assertEqual(self.git("status", "--porcelain"), "")

        entries = self.git("log", "--reverse", "--format=%aI %cI %ae %ce %an", f"{self.initial}..HEAD").splitlines()
        self.assertEqual([row.replace("Z ", "+00:00 ") for row in entries], [
            f"{day}T09:15:00+00:00 {day}T09:15:00+00:00 integration@example.invalid integration@example.invalid Local Integration Test"
            for day in ("2024-02-29", "2024-02-29", "2024-03-01")
        ])
        activity = self.git("diff", "--name-only", f"{self.initial}..HEAD")
        self.assertRegex(activity, r"^\.brush-io-activity-[\da-f]+\.log$")
        for commit in self.git("rev-list", f"{self.initial}..HEAD").splitlines():
            self.assertEqual(self.git("diff-tree", "--no-commit-id", "--name-only", "-r", commit), activity)

        again = self.script("--apply", "--yes", "--hour", "9", "--minute", "15")
        self.assertEqual(again.returncode, 0, again.stderr)
        self.assertIn("0 (3 of 3 already created)", again.stdout)
        self.assertEqual(self.git("rev-parse", "HEAD"), latest)
        self.git("switch", "unrelated")
        wrong_branch = self.script("--apply", "--yes", "--hour", "9", "--minute", "15")
        self.assertNotEqual(wrong_branch.returncode, 0)
        self.assertIn("outside the current branch", wrong_branch.stderr)
        self.assertEqual(self.git("rev-parse", "HEAD"), self.initial)

    def test_dirty_tree_future_and_incomplete_push_are_refused(self):
        future = self.script("--apply", "--yes", file=FUTURE_SCRIPT)
        self.assertNotEqual(future.returncode, 0)
        self.assertIn("in the future", future.stderr)

        push = self.script("--push", "--yes")
        self.assertNotEqual(push.returncode, 0)
        self.assertIn("Apply the complete plan locally", push.stderr)

        self.seed.write_text("local work", encoding="utf-8")
        (self.repo / "untracked.txt").write_text("untracked work", encoding="utf-8")
        dirty = self.script("--apply", "--yes")
        self.assertNotEqual(dirty.returncode, 0)
        self.assertIn("uncommitted changes", dirty.stderr)
        self.assertEqual(self.git("rev-parse", "HEAD"), self.initial)
        self.assertEqual(self.seed.read_text(encoding="utf-8"), "local work")
        self.assertEqual((self.repo / "untracked.txt").read_text(encoding="utf-8"), "untracked work")

    def test_apply_resumes_after_a_cleaned_up_hook_failure(self):
        hook = self.repo / ".git" / "hooks" / "pre-commit"
        hook.write_text("#!/bin/sh\ntest \"$(git rev-list --count HEAD)\" -lt 2\n", encoding="utf-8")
        hook.chmod(0o755)
        interrupted = self.script("--apply", "--yes")
        self.assertNotEqual(interrupted.returncode, 0)
        self.assertEqual(self.git("rev-list", "--count", f"{self.initial}..HEAD"), "1")
        activity = self.git("diff", "--name-only", f"{self.initial}..HEAD")
        self.git("restore", "--source=HEAD", "--staged", "--worktree", "--", activity)
        hook.unlink()
        resumed = self.script("--apply", "--yes")
        self.assertEqual(resumed.returncode, 0, resumed.stderr)
        self.assertIn("New commits: 2 (1 of 3 already created)", resumed.stdout)
        self.assertEqual(self.git("rev-list", "--count", f"{self.initial}..HEAD"), "3")


if __name__ == "__main__":
    unittest.main(verbosity=2)

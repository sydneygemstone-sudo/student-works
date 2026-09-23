#!/usr/bin/env python3
"""Offline, dependency-free approved-HUB preflight; no auto-update/repair mode."""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import sys

EXPECTED_ID = "CLASSROOM-HUB-R5-20260923"
EXPECTED_VERSION = "3.0.0"
EXPECTED_BASELINE = "f45d0750b78322937be17a6a6af743b2d5c08755"
EXPECTED_DOC_SHA256 = "d970904df9925ccb77a49a632c7ef20741f8feb0d6f98841065d47180d4ce58e"
DOC_PATH = "docs/hub-standard/HUB-STANDARD.md"
LOCK_PATH = "docs/hub-standard/LOCK.json"

class LockFailure(RuntimeError):
    pass

def demand(condition: bool, message: str) -> None:
    if not condition:
        raise LockFailure(message)

def local(root: Path, relative: str) -> Path:
    p = (root / relative).resolve()
    demand(p.is_relative_to(root.resolve()), f"Unsafe path: {relative}")
    demand(p.is_file(), f"Missing required file: {relative}")
    return p

def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def check(root: Path, *, history: bool = True) -> dict:
    entry = json.loads(local(root, "HUB-ENTRY.json").read_text(encoding="utf-8"))
    lock = json.loads(local(root, LOCK_PATH).read_text(encoding="utf-8"))
    for name, item in [("entry", entry), ("lock", lock)]:
        demand(item.get("standard_id") == EXPECTED_ID, f"{name}: wrong standard ID")
        demand(item.get("version") == EXPECTED_VERSION, f"{name}: wrong standard version")
        demand(item.get("status") == "APPROVED_LOCKED", f"{name}: unapproved standard")
        demand(item.get("baseline_commit") == EXPECTED_BASELINE, f"{name}: wrong baseline commit")
    demand(entry.get("standard") == DOC_PATH and entry.get("lock") == LOCK_PATH, "Wrong canonical paths")
    demand(sha(local(root, DOC_PATH).read_bytes()) == EXPECTED_DOC_SHA256, "Canonical document fingerprint mismatch")
    protected = lock.get("artifacts_sha256", {})
    demand({DOC_PATH, "HUB-ENTRY.json", "AGENTS.md", "CLAUDE.md", "scripts/verify_hub_standard.py", "docs/hub-standard/SKILL.md", ".github/workflows/hub-standard-lock.yml"} <= protected.keys(), "Incomplete entry protection")
    for name, expected in protected.items():
        demand(sha(local(root, name).read_bytes()) == expected, f"Standard/entry drift: {name}")
    baseline = lock.get("baseline_files_sha256", {})
    for required in ["classroom-2026-09-22/studio.js", "classroom-2026-09-22/studio-r5.css", "classroom-2026-09-22/studio-data.json", "classroom-2026-09-22/learning-record.json", "classroom-2026-09-22/kehan-hub.html", "classroom-2026-09-22/harrison-zavier-hub.html"]:
        demand(required in baseline, f"Missing golden reference: {required}")
    for name, expected in baseline.items():
        demand(sha(local(root, name).read_bytes()) == expected, f"Approved r5 reference changed: {name}")
        if history:
            got = subprocess.run(["git", "-C", str(root), "show", f"{EXPECTED_BASELINE}:{name}"], capture_output=True, check=False)
            demand(got.returncode == 0, f"Pinned git object unavailable: {name}; fetch exact history, do not fall back")
            demand(sha(got.stdout) == expected, f"Lock does not match approved git object: {name}")
    readme = local(root, "README.md").read_text(encoding="utf-8")
    demand(EXPECTED_ID in readme and DOC_PATH in readme, "README canonical entry missing")
    return {"status": "PASS", "standard_id": EXPECTED_ID, "version": EXPECTED_VERSION, "baseline_commit": EXPECTED_BASELINE, "protected_artifacts": len(protected), "golden_files": len(baseline), "fallback": "FORBIDDEN"}

def self_test(root: Path) -> list[str]:
    check(root)
    lock = json.loads((root / LOCK_PATH).read_text(encoding="utf-8"))
    files = set(lock["artifacts_sha256"]) | set(lock["baseline_files_sha256"]) | {LOCK_PATH, "README.md"}
    results = []
    with tempfile.TemporaryDirectory(prefix="hub-lock-selftest-") as tmp:
        fixture = Path(tmp)
        for name in files:
            target = fixture / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(root / name, target)
        check(fixture, history=False)
        cases = [
            ("wrong-old-ID", "HUB-ENTRY.json", lambda b: b.replace(EXPECTED_ID.encode(), b"CLASSROOM-HUB-OLD")),
            ("wrong-old-version", "HUB-ENTRY.json", lambda b: b.replace(b'"3.0.0"', b'"2.0.0"')),
            ("missing-standard", DOC_PATH, None),
            ("changed-standard", DOC_PATH, lambda b: b + b"\nchanged without approval\n"),
            ("old-or-changed-layout", "classroom-2026-09-22/studio.js", lambda b: b + b"\n// stale layout\n"),
        ]
        for label, name, mutate in cases:
            path = fixture / name
            original = path.read_bytes()
            try:
                path.unlink() if mutate is None else path.write_bytes(mutate(original))
                rejected = False
                try:
                    check(fixture, history=False)
                except (LockFailure, FileNotFoundError):
                    rejected = True
                demand(rejected, f"Negative test did not reject: {label}")
                results.append(f"REJECTED_AS_EXPECTED: {label}")
            finally:
                path.write_bytes(original)
        check(fixture, history=False)
    return results

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true", help="Test failures in temporary copies; never alter live files")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    try:
        result = check(root)
        if args.self_test:
            result["negative_tests"] = self_test(root)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except (LockFailure, OSError, ValueError, subprocess.SubprocessError) as exc:
        print(json.dumps({"status": "FAIL", "error": str(exc), "instruction": "Stop template reuse; do not use an older fallback."}, ensure_ascii=False, indent=2), file=sys.stderr)
        return 1

if __name__ == "__main__":
    raise SystemExit(main())

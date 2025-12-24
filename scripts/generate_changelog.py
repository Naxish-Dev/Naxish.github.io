#!/usr/bin/env python3
import subprocess
from collections import defaultdict
from datetime import datetime
import os
import shutil

# Patterns we consider "noise" and skip in the changelog
SKIP_PREFIXES = [
    "Merge ",
    "Create CNAME",
    "Delete CNAME",
]
SKIP_EXACT = {
    "asd",
    "123",
    "test",
    "13213",
}
# If a subject contains any of these substrings, we skip it
SKIP_CONTAINS = [
    "CNAME",
]

# How many dates to include (newest first)
MAX_DAYS = 7   # Change as needed


def is_noise(subject: str) -> bool:
    subject = subject.strip()
    if not subject:
        return True

    lower = subject.lower()

    # Skip explicit junk
    if subject in SKIP_EXACT:
        return True

    # Skip messages starting with prefixes
    for p in SKIP_PREFIXES:
        if subject.startswith(p):
            return True

    # Skip messages containing substrings
    for c in SKIP_CONTAINS:
        if c.lower() in lower:
            return True

    # Skip chore commits (e.g. "chore: something")
    if lower.startswith("chore:"):
        return True

    # Skip commits intentionally marked no-log
    if "-nolog" in lower:
        return True

    # Very short junk
    if len(subject) <= 2:
        return True

    return False


def get_git_log():
    """
    Returns lines like: 2025-11-14|Message text
    """
    cmd = [
        "git",
        "log",
        "--pretty=format:%ad|%s",
        "--date=short",
    ]
    result = subprocess.run(cmd, check=True, capture_output=True, text=True)
    return result.stdout.splitlines()


def normalize_subject(subject: str) -> str:
    return subject.strip().capitalize()


def build_changelog():
    log_lines = get_git_log()
    by_date = defaultdict(list)

    for line in log_lines:
        if "|" not in line:
            continue
        date_str, subject = line.split("|", 1)
        subject = subject.strip()
        date_str = date_str.strip()

        if is_noise(subject):
            continue

        normalized = normalize_subject(subject)

        # Avoid duplicates per date
        if normalized not in by_date[date_str]:
            by_date[date_str].append(normalized)

    # Sort newest dates first, limit to MAX_DAYS
    sorted_dates = sorted(by_date.keys(), reverse=True)[:MAX_DAYS]

    lines = []
    for date_str in sorted_dates:
        try:
            datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            continue

        changes = by_date[date_str]
        if not changes:
            continue

        lines.append(date_str)
        for c in changes:
            lines.append(f"- {c}")
        lines.append("")

    return "\n".join(lines).strip() + "\n"


def main():
    changelog = build_changelog()

    repo_root = os.getcwd()
    docs_dir = os.path.join(repo_root, "docs")
    os.makedirs(docs_dir, exist_ok=True)

    # Write changelog
    out_path = os.path.join(docs_dir, "changelog.txt")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(changelog)

    print("Generated docs/changelog.txt")

    # Copy VERSION file from root to docs
    version_src = os.path.join(repo_root, "VERSION")
    version_dst = os.path.join(docs_dir, "VERSION")
    
    if os.path.exists(version_src):
        shutil.copy2(version_src, version_dst)
        print("Copied VERSION to docs/VERSION")
    else:
        print("Warning: VERSION file not found in root directory")


if __name__ == "__main__":
    main()

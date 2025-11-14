#!/usr/bin/env python3
import subprocess
from collections import defaultdict
from datetime import datetime
import os

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

def is_noise(subject: str) -> bool:
    subject = subject.strip()
    if not subject:
        return True
    if subject in SKIP_EXACT:
        return True
    for p in SKIP_PREFIXES:
        if subject.startswith(p):
            return True
    for c in SKIP_CONTAINS:
        if c in subject:
            return True
    # Very short junk messages
    if len(subject) <= 2:
        return True
    return False

def get_git_log():
    """
    Returns lines like: 2025-11-14|Updead to the changelog system
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
    """
    Here you can lightly clean up messages.
    We're not doing full 'professional rewording',
    but you can tweak common patterns here.
    """
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

    # Sort dates descending (newest first)
    sorted_dates = sorted(by_date.keys(), reverse=True)

    lines = []
    for date_str in sorted_dates:
        # Ensure valid date formatting (YYYY-MM-DD)
        try:
            datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            # Skip weird dates just in case
            continue

        changes = by_date[date_str]
        if not changes:
            continue

        lines.append(date_str)
        for c in changes:
            lines.append(f"- {c}")
        lines.append("")  # blank line between days

    return "\n".join(lines).strip() + "\n"

def main():
    changelog = build_changelog()
    out_path = os.path.join(os.getcwd(), "/docs/changelog.txt")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(changelog)
    print("Generated changelog.txt")

if __name__ == "__main__":
    main()

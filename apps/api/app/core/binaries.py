import os
import sys
from pathlib import Path
from shutil import which


def resolve_binary_path(binary_name: str) -> str | None:
    """Resolve an executable via PATH, falling back to the active interpreter's bin dir."""
    path_binary = which(binary_name)
    if path_binary is not None:
        return path_binary
    python_bin_candidate = Path(sys.executable).parent / binary_name
    if python_bin_candidate.exists() and os.access(python_bin_candidate, os.X_OK):
        return str(python_bin_candidate)
    return None

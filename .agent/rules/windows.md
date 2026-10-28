# Rule: Windows compatibility (always on)
- Scripts in package.json must run in PowerShell and CMD.
- Use `cross-env` for env vars; avoid `rm -rf`, `cp`, `&&` chains that rely on bash features (use `npm-run-all2` / `concurrently`).
- Line endings: `.gitattributes` with `* text=auto`.
- Python: `py -m venv`, activate with `.\.venv\Scripts\Activate.ps1`.

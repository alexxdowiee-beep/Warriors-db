# Warriors & Leaders Database

A globally balanced, source-graded database of warriors, commanders, rulers and strategists,
being built into an interactive learning app.

- Rules for contributors (and Claude Code): `CLAUDE.md`
- Foundation proposal and methodology: `docs/`
- App brief (version 1): `docs/APP_BRIEF.md`
- First task for Claude Code: `SETUP_BRIEF.md`

The app is published at https://alexxdowiee-beep.github.io/Warriors-db/ and installs on Android
from Chrome (menu › Install app). It works offline after one visit.

## Updating the app

After each batch of research, from the repository folder (Windows PowerShell):

1. **Validate and build.** `.venv\Scripts\python.exe scripts\validate.py` must report 0 errors
   (warnings are allowed), then `.venv\Scripts\python.exe scripts\build_db.py` builds
   `build/warriors.sqlite`.
2. **Export.** `.venv\Scripts\python.exe scripts\export_app.py` rewrites `app/data/` from the
   database. The same data always gives identical files, so Git shows only real changes.
3. **Check.** Run all tests with `.venv\Scripts\python.exe -m unittest discover -s tests`, then look at
   the app locally: `.venv\Scripts\python.exe -m http.server 8000 --directory app` and open
   http://localhost:8000 (Ctrl+C stops the server). Optional: `python scripts\check_offline.py <empty
   temporary folder>` confirms the app still works offline (needs Google Chrome).
4. **Commit and push** the data, `app/data/` and any app changes: `git add -A`, `git commit`, `git push`.
5. **Publish.** `powershell -ExecutionPolicy Bypass -File scripts\publish_app.ps1` checks everything
   again (no uncommitted changes, validator, build, export, tests), then pushes `app/` to the
   `gh-pages` branch. GitHub Pages updates within a minute or two; an installed app picks up the new
   version the next time it is opened online.

Never edit `app/data/` or the `gh-pages` branch by hand: both are generated.

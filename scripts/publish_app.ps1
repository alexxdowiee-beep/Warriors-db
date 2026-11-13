# Publish the app to GitHub Pages (docs/APP_BRIEF.md, step 7; option A chosen by the owner).
#
#   powershell -ExecutionPolicy Bypass -File scripts\publish_app.ps1
#
# 1. Stops if there are uncommitted changes, so what is published is exactly what is committed.
# 2. Runs the validator, rebuilds the database, re-exports the app data and runs all tests.
# 3. Stops if the export changed anything in app/ (commit those changes first, then run it again).
# 4. Pushes the app/ folder, and only that folder, to the gh-pages branch on GitHub.
#
# GitHub Pages serves the gh-pages branch at https://alexxdowiee-beep.github.io/Warriors-db/
# The gh-pages branch is generated: never edit it by hand.

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo
$python = Join-Path $repo '.venv\Scripts\python.exe'

function Step($text) { Write-Host "`n== $text" -ForegroundColor Yellow }
function Fail($text) { Write-Host "STOPPED: $text" -ForegroundColor Red; exit 1 }

Step 'Checking for uncommitted changes'
$dirty = git status --porcelain
if ($dirty) { Fail "commit or discard these changes first:`n$($dirty -join "`n")" }

Step 'Validating the database'
& $python scripts\validate.py
if ($LASTEXITCODE -ne 0) { Fail 'the validator reported errors' }

Step 'Building the database and exporting the app data'
& $python scripts\build_db.py
if ($LASTEXITCODE -ne 0) { Fail 'build_db.py failed' }
& $python scripts\export_app.py
if ($LASTEXITCODE -ne 0) { Fail 'export_app.py failed' }

Step 'Running the tests'
& $python -m unittest discover -s tests
if ($LASTEXITCODE -ne 0) { Fail 'tests failed' }

Step 'Checking the export matches what is committed'
$changed = git status --porcelain -- app
if ($changed) { Fail "the export changed app/ - review and commit these files, then publish again:`n$($changed -join "`n")" }

Step 'Pushing app/ to the gh-pages branch'
$commit = git subtree split --prefix app HEAD
if ($LASTEXITCODE -ne 0 -or -not $commit) { Fail 'git subtree split failed' }
# --force: gh-pages is generated from app/ and always replaced by the current version
git push --force origin "$($commit.Trim()):refs/heads/gh-pages"
if ($LASTEXITCODE -ne 0) { Fail 'push to gh-pages failed' }

Write-Host "`nPublished $(git rev-parse --short HEAD) to gh-pages." -ForegroundColor Green
Write-Host 'GitHub Pages updates within a minute or two: https://alexxdowiee-beep.github.io/Warriors-db/'

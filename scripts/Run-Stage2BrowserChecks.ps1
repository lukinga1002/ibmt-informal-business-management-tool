param([string]$BaseUrl = 'http://localhost:5173', [string]$Channel = 'chrome')
$ErrorActionPreference = 'Stop'
$toolsDirectory = Join-Path ([IO.Path]::GetTempPath()) 'ibmt-playwright-tools'
$playwrightModule = Join-Path $toolsDirectory 'node_modules\playwright\index.mjs'
if (-not (Test-Path -LiteralPath $playwrightModule)) {
    & npm.cmd install --prefix $toolsDirectory --no-save --no-package-lock --ignore-scripts --no-audit --no-fund playwright
    if ($LASTEXITCODE -ne 0) { throw 'Playwright installation failed. Keep the app server running and retry.' }
}
& node (Join-Path $PSScriptRoot 'stage2-browser-check.mjs') --playwright $playwrightModule --base-url $BaseUrl --channel $Channel
exit $LASTEXITCODE

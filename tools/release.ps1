<#
.SYNOPSIS
  Vydani nove verze aplikace Planovaci kalendar.

.DESCRIPTION
  Provede cely zavazny postup vydani v jednom kroku:
    1. zmeni cislo verze a datum v server/00_config.js (odtud se bere footer),
    2. prepise AAA_VERZE.html (prvni soubor v editoru Apps Scriptu),
    3. zapise zaznam do CHANGELOG.md,
    4. git commit (vsechny zmeny - verze i pripadne dalsi upravy kodu),
    5. git pull --rebase (jen kdyz vzdalena vetev uz existuje),
    6. git tag + push na GitHub,
    7. clasp push do Apps Scriptu.

  Verze zije na trech mistech (AAA_VERZE.html, CONFIG.version, CHANGELOG.md)
  a musi vsude souhlasit - proto se nikdy nepise rucne, jen timto skriptem.

  Poznamka k poradi: commit jde pred pullem zamerne - v okamziku spusteni
  skriptu je strom vzdy "spinavy" (cerstva uprava verze), takze pull na
  spinavem stromu by vzdy selhal. Rebase po commitu je bezpecny, protoze
  prehrava jen tento jeden novy commit nad pripadnymi cizimi zmenami.
  Git jde pred clasp push podle dohodnuteho postupu - kdyby clasp push
  selhal, commit uz je v gitu, skript na to upozorni a staci pak spustit
  "npx clasp push -f" rucne.

.PARAMETER Version
  Cislo verze ve tvaru vX.Y.Z, napriklad v0.1.0.

.PARAMETER Message
  Popis zmen. Jednotlive body oddel strednikem.

.EXAMPLE
  .\tools\release.ps1 -Version v0.1.0 -Message "Faze 1: wizard, databaze, opravneni"
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$Version,

  [Parameter(Mandatory = $true)]
  [string]$Message
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent

# ── Kontrola tvaru verze ──────────────────────────────────────────────────
if ($Version -notmatch '^v\d+\.\d+\.\d+$') {
  throw "Verze musi mit tvar vX.Y.Z (napriklad v0.1.0)."
}

$stamp = Get-Date -Format 'dd.MM.yyyy HH:mm'
$releaseDate = Get-Date -Format 'd.M.yyyy'

# ── 1) server/00_config.js: CONFIG.version + CONFIG.releaseDate ───────────
$configPath = Join-Path $root 'server\00_config.js'
$config = Get-Content $configPath -Raw -Encoding UTF8

if ($config -match [regex]::Escape("version: '$Version'")) {
  throw "Verze $Version uz je v konfiguraci nastavena - zvol vyssi cislo."
}

$config = $config -replace "version: 'v[^']*'", "version: '$Version'"
$config = $config -replace "releaseDate: '[^']*'", "releaseDate: '$releaseDate'"
Set-Content $configPath $config -NoNewline -Encoding UTF8

# ── 2) AAA_VERZE.html: prepise se jen hodnota verze a data ───────────────
# Ramecek se needituje - jen se do nej vlozi nova hodnota doplnena mezerami
# na puvodni sirku, aby prava hrana ramecku zustala zarovnana.
# Popisky se hledaji vzorem "NASAZEN." misto "NASAZENA/NASAZENI", aby skript
# sam neobsahoval diakritiku a nezalezelo na jeho kodovani.

function Set-BoxValue {
  param(
    [string]$Text,
    [string]$LabelPattern,
    [string]$Value
  )

  # Ramovaci znak na zacatku i konci radku se bere jako libovolny znak (.),
  # protoze je mimo ASCII a nema smysl ho psat primo do skriptu.
  $rx = [regex]"(?m)^(?<pre>.\s+$LabelPattern\s+)(?<val>\S.*?)(?<pad>\s*)(?<end>.)\s*$"
  $m = $rx.Match($Text)
  if (-not $m.Success) {
    throw "V AAA_VERZE.html se nepodarilo najit radek s popiskem: $LabelPattern"
  }

  $width = $m.Groups['val'].Value.Length + $m.Groups['pad'].Value.Length
  if ($Value.Length -gt $width) { $width = $Value.Length }

  $line = $m.Groups['pre'].Value + $Value.PadRight($width) + $m.Groups['end'].Value
  return $Text.Substring(0, $m.Index) + $line + $Text.Substring($m.Index + $m.Length)
}

$verzePath = Join-Path $root 'AAA_VERZE.html'
$verze = Get-Content $verzePath -Raw -Encoding UTF8
$verze = Set-BoxValue -Text $verze -LabelPattern 'NASAZEN. VERZE:' -Value $Version
$verze = Set-BoxValue -Text $verze -LabelPattern 'DATUM NASAZEN.:' -Value $stamp
Set-Content $verzePath $verze -NoNewline -Encoding UTF8

# ── 3) CHANGELOG.md: novy zaznam hned pod hlavicku ───────────────────────
$bullets = ($Message -split ';') |
  ForEach-Object { $_.Trim() } |
  Where-Object { $_ -ne '' } |
  ForEach-Object { "- $_" }

$changelogPath = Join-Path $root 'CHANGELOG.md'
$lines = Get-Content $changelogPath -Encoding UTF8

# Zaznam se vklada za uvodni blok (hlavicka + popis), tedy pred prvni "## ".
$firstEntry = ($lines | Select-String -Pattern '^## ' | Select-Object -First 1).LineNumber
$insertAt = if ($firstEntry) { $firstEntry - 1 } else { $lines.Count }

# Prazdny radek pred zaznamem, aby nadpis nelepil na predchozi text.
$entry = @()
if ($insertAt -gt 0 -and $lines[$insertAt - 1].Trim() -ne '') { $entry += '' }
$entry += @("## $Version - $stamp") + $bullets + @('')

$updated = @()
if ($insertAt -gt 0) { $updated += $lines[0..($insertAt - 1)] }
$updated += $entry
if ($insertAt -lt $lines.Count) { $updated += $lines[$insertAt..($lines.Count - 1)] }

Set-Content $changelogPath $updated -Encoding UTF8

Write-Host "Verze nastavena na $Version ($stamp)." -ForegroundColor Green

Push-Location $root
try {
  # ── 4) git commit ───────────────────────────────────────────────────────
  # Commit MUSI byt pred pullem: v okamziku spusteni release.ps1 je strom
  # vzdy "spinavy" (prave doslo k uprave verze v krocich 1-3, casto i
  # k dalsim zmenam v kodu) - "git pull --rebase" na spinavem stromu vzdy
  # selze. Radne poradi je: nejdriv vlastni zmeny zacommitovat, teprve pak
  # rebase na aktualni vzdalenou vetev - rebase pak jen prehraje tento jeden
  # commit nad pripadnymi cizimi commity, coz je bezpecne.
  git add -A

  $commitMessage = @"
${Version}: $Message

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
"@

  git commit -m $commitMessage
  if ($LASTEXITCODE -ne 0) { throw "git commit selhal - zkontroluj, jestli jsou vubec nejake zmeny." }

  # ── 5) git pull --rebase (jen kdyz vzdalena vetev main uz existuje) ────
  # Strom je od commitu cisty, takze rebase nemuze narazit na lokalni
  # nezacommitovane zmeny - jen na pripadne cizi commity na vzdalene vetvi.
  $remoteMain = git ls-remote --heads origin main
  if ($LASTEXITCODE -ne 0) { throw "Spojeni s GitHubem selhalo - commit je hotovy lokalne, push zopakuj rucne az bude spojeni funkcni." }

  if ($remoteMain) {
    git pull --rebase origin main
    if ($LASTEXITCODE -ne 0) { throw "git pull selhal (nejspis konflikt) - commit je hotovy lokalne, vyres konflikt a dokonci push rucne." }
  } else {
    Write-Host "Vzdalena vetev main jeste neexistuje - pull se preskakuje (prvni vydani)." -ForegroundColor Yellow
  }

  # ── 6) git tag + push ────────────────────────────────────────────────────
  git tag $Version
  if ($LASTEXITCODE -ne 0) { throw "Vytvoreni tagu $Version selhalo - tag uz nejspis existuje." }

  git push -u origin main --tags
  if ($LASTEXITCODE -ne 0) { throw "git push selhal - commit i tag jsou vytvorene lokalne, push zopakuj rucne." }

  # ── 6) clasp push do Apps Scriptu ──────────────────────────────────────
  npx clasp push -f
  if ($LASTEXITCODE -ne 0) {
    throw "clasp push selhal. POZOR: verze uz je v gitu, ale NENI v Apps Scriptu. Spust rucne: npx clasp push -f"
  }
}
finally {
  Pop-Location
}

Write-Host ''
Write-Host "Release $Version dokoncen: git push + tag + clasp push." -ForegroundColor Green
Write-Host 'Nasazeni nove verze web appky proved rucne v editoru (Nasadit - Spravovat nasazeni).'

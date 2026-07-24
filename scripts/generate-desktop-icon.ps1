$workspaceRoot = Split-Path -Parent $PSScriptRoot
$pngPath = Join-Path $workspaceRoot "public\icon-256.png"
$desktopDirectory = Join-Path $workspaceRoot "desktop"
$icoPath = Join-Path $desktopDirectory "icon.ico"

if (-not (Test-Path -LiteralPath $pngPath)) {
  throw "Primero ejecuta scripts\generate-icons.ps1."
}

$pngBytes = [System.IO.File]::ReadAllBytes($pngPath)
$stream = [System.IO.File]::Open(
  $icoPath,
  [System.IO.FileMode]::Create,
  [System.IO.FileAccess]::Write
)
$writer = [System.IO.BinaryWriter]::new($stream)

try {
  $writer.Write([UInt16]0)
  $writer.Write([UInt16]1)
  $writer.Write([UInt16]1)

  $writer.Write([Byte]0)
  $writer.Write([Byte]0)
  $writer.Write([Byte]0)
  $writer.Write([Byte]0)
  $writer.Write([UInt16]1)
  $writer.Write([UInt16]32)
  $writer.Write([UInt32]$pngBytes.Length)
  $writer.Write([UInt32]22)
  $writer.Write($pngBytes)
}
finally {
  $writer.Dispose()
  $stream.Dispose()
}

Write-Output $icoPath

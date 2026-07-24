Add-Type -AssemblyName System.Drawing

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$outputDirectory = Join-Path $workspaceRoot "public"

foreach ($size in @(192, 512)) {
  $bitmap = [System.Drawing.Bitmap]::new($size, $size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml("#153e2e"))

  $limeBrush = [System.Drawing.SolidBrush]::new(
    [System.Drawing.ColorTranslator]::FromHtml("#c7ee6c")
  )
  $ivoryBrush = [System.Drawing.SolidBrush]::new(
    [System.Drawing.ColorTranslator]::FromHtml("#f3f0e8")
  )
  $darkPen = [System.Drawing.Pen]::new(
    [System.Drawing.ColorTranslator]::FromHtml("#153e2e"),
    [Math]::Max(4, [Math]::Round($size * 0.032))
  )

  $graphics.FillEllipse(
    $limeBrush,
    [Math]::Round($size * 0.56),
    [Math]::Round($size * -0.08),
    [Math]::Round($size * 0.52),
    [Math]::Round($size * 0.52)
  )

  $font = [System.Drawing.Font]::new(
    "Segoe UI",
    [Math]::Round($size * 0.47),
    [System.Drawing.FontStyle]::Bold,
    [System.Drawing.GraphicsUnit]::Pixel
  )
  $graphics.DrawString(
    "R",
    $font,
    $ivoryBrush,
    [Math]::Round($size * 0.20),
    [Math]::Round($size * 0.20)
  )

  $graphics.DrawLine(
    $darkPen,
    [Math]::Round($size * 0.69),
    [Math]::Round($size * 0.18),
    [Math]::Round($size * 0.86),
    [Math]::Round($size * 0.18)
  )

  $outputPath = Join-Path $outputDirectory "icon-$size.png"
  $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

  $font.Dispose()
  $darkPen.Dispose()
  $ivoryBrush.Dispose()
  $limeBrush.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

Add-Type -AssemblyName System.Drawing

$workspaceRoot = Split-Path -Parent $PSScriptRoot
$outputDirectory = Join-Path $workspaceRoot "public"

foreach ($size in @(192, 512)) {
  $bitmap = [System.Drawing.Bitmap]::new($size, $size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml("#8f1824"))

  $ivoryBrush = [System.Drawing.SolidBrush]::new(
    [System.Drawing.ColorTranslator]::FromHtml("#fffdfa")
  )
  $ivoryPen = [System.Drawing.Pen]::new(
    [System.Drawing.ColorTranslator]::FromHtml("#fffdfa"),
    [Math]::Max(4, [Math]::Round($size * 0.026))
  )

  $shield = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $shield.AddPolygon([System.Drawing.PointF[]]@(
    [System.Drawing.PointF]::new($size * 0.18, $size * 0.23),
    [System.Drawing.PointF]::new($size * 0.50, $size * 0.16),
    [System.Drawing.PointF]::new($size * 0.82, $size * 0.23),
    [System.Drawing.PointF]::new($size * 0.79, $size * 0.59),
    [System.Drawing.PointF]::new($size * 0.68, $size * 0.78),
    [System.Drawing.PointF]::new($size * 0.50, $size * 0.90),
    [System.Drawing.PointF]::new($size * 0.32, $size * 0.78),
    [System.Drawing.PointF]::new($size * 0.21, $size * 0.59)
  ))
  $shield.CloseFigure()
  $graphics.DrawPath($ivoryPen, $shield)

  foreach ($x in @(0.39, 0.46, 0.54, 0.61)) {
    $graphics.DrawLine(
      $ivoryPen,
      [Math]::Round($size * $x),
      [Math]::Round($size * 0.05),
      [Math]::Round($size * $x),
      [Math]::Round($size * 0.17)
    )
  }

  $font = [System.Drawing.Font]::new(
    "Georgia",
    [Math]::Round($size * 0.28),
    [System.Drawing.FontStyle]::Bold,
    [System.Drawing.GraphicsUnit]::Pixel
  )
  $format = [System.Drawing.StringFormat]::new()
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $graphics.DrawString(
    "UP",
    $font,
    $ivoryBrush,
    [System.Drawing.RectangleF]::new(
      $size * 0.20,
      $size * 0.22,
      $size * 0.60,
      $size * 0.50
    ),
    $format
  )

  $outputPath = Join-Path $outputDirectory "icon-$size.png"
  $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

  $format.Dispose()
  $font.Dispose()
  $shield.Dispose()
  $ivoryPen.Dispose()
  $ivoryBrush.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

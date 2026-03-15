Add-Type -AssemblyName System.Drawing

function Save-Icon {
  param([int]$size, [string]$path)

  $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g   = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.Clear([System.Drawing.Color]::Transparent)

  # Rounded rectangle path
  $r  = [int]($size * 0.18)
  $gp = New-Object System.Drawing.Drawing2D.GraphicsPath
  $gp.AddArc(0,           0,           $r*2, $r*2, 180, 90)
  $gp.AddArc($size-$r*2,  0,           $r*2, $r*2, 270, 90)
  $gp.AddArc($size-$r*2,  $size-$r*2,  $r*2, $r*2,   0, 90)
  $gp.AddArc(0,           $size-$r*2,  $r*2, $r*2,  90, 90)
  $gp.CloseFigure()

  # Base red fill
  $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 214, 40, 40))
  $g.FillPath($bgBrush, $gp)

  # Subtle top-light overlay for depth
  $glowBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0, 0)),
    (New-Object System.Drawing.Point(0, $size)),
    [System.Drawing.Color]::FromArgb(55, 255, 255, 255),
    [System.Drawing.Color]::FromArgb(0,  255, 255, 255)
  )
  $g.FillPath($glowBrush, $gp)

  # Thin inner border for polish
  $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(40, 255, 255, 255), [int]([Math]::Max(1, $size * 0.012)))
  $g.DrawPath($borderPen, $gp)

  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment     = [System.Drawing.StringAlignment]::Center
  $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)

  # "72" – primary number (senter i øvre 65% av ikonet)
  $font72   = New-Object System.Drawing.Font("Arial", [int]($size * 0.50), [System.Drawing.FontStyle]::Bold)
  $rect72   = New-Object System.Drawing.RectangleF(0, 0, $size, [int]($size * 0.65))
  $g.DrawString("72", $font72, $white, $rect72, $sf)

  # "klar!" – sub-label i nederste 28% av ikonet, tydelig atskilt fra "72"
  $fontKlar = New-Object System.Drawing.Font("Arial", [int]($size * 0.155), [System.Drawing.FontStyle]::Bold)
  $rectKlar = New-Object System.Drawing.RectangleF(0, [int]($size * 0.68), $size, [int]($size * 0.28))
  $g.DrawString("klar!", $fontKlar, $white, $rectKlar, $sf)

  $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "  [OK] $path"
}

function Save-OGImage {
  param([string]$path)

  $w = 1200; $h = 630
  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $g   = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  # Background: very dark navy
  $g.Clear([System.Drawing.Color]::FromArgb(255, 10, 10, 15))

  # Subtle card gradient overlay
  $cardBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0,   0)),
    (New-Object System.Drawing.Point($w,  $h)),
    [System.Drawing.Color]::FromArgb(30, 28, 28, 48),
    [System.Drawing.Color]::FromArgb(0,   0,  0,  0)
  )
  $g.FillRectangle($cardBrush, 0, 0, $w, $h)

  # Right-side red ambient glow
  $glowBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point($w,          [int]($h/2))),
    (New-Object System.Drawing.Point([int]($w*0.45), [int]($h/2))),
    [System.Drawing.Color]::FromArgb(22, 214, 40, 40),
    [System.Drawing.Color]::Transparent
  )
  $g.FillRectangle($glowBrush, 0, 0, $w, $h)

  # Left red accent bar (10px, full height gradient)
  $barBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0, 0)),
    (New-Object System.Drawing.Point(0, $h)),
    [System.Drawing.Color]::FromArgb(255, 232, 68,  68),
    [System.Drawing.Color]::FromArgb(255, 100,  0,   0)
  )
  $g.FillRectangle($barBrush, 0, 0, 10, $h)

  # Color brushes
  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $muted = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 160, 160, 184))
  $red   = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 232, 68,  68))

  # Watermark "72" (subtle, large, bottom-right)
  $fontWM  = New-Object System.Drawing.Font("Arial", 260, [System.Drawing.FontStyle]::Bold)
  $wmBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(10, 255, 255, 255))
  $g.DrawString("72", $fontWM, $wmBrush, (New-Object System.Drawing.PointF(790, 200)))

  # Main title "72klar!"
  $fontTitle = New-Object System.Drawing.Font("Arial", 105, [System.Drawing.FontStyle]::Bold)
  $g.DrawString("72klar!", $fontTitle, $white, (New-Object System.Drawing.PointF(52, 100)))

  # Separator line
  $linePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(50, 214, 40, 40), 1)
  $g.DrawLine($linePen, 54, 282, 680, 282)

  # Tagline
  $fontTag = New-Object System.Drawing.Font("Arial", 28, [System.Drawing.FontStyle]::Regular)
  $g.DrawString("Bli klar til aa klare deg selv - i 72 timer", $fontTag, $muted, (New-Object System.Drawing.PointF(54, 298)))

  # DSB attribution
  $fontAttr = New-Object System.Drawing.Font("Arial", 19, [System.Drawing.FontStyle]::Regular)
  $g.DrawString("Basert paa anbefalinger fra DSB  |  Gratis  |  Ingen konto", $fontAttr, $muted, (New-Object System.Drawing.PointF(54, 350)))

  # Stats divider
  $linePen2 = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(35, 255, 255, 255), 1)
  $g.DrawLine($linePen2, 54, 418, 700, 418)

  # Stats row
  $fontStatVal = New-Object System.Drawing.Font("Arial", 22, [System.Drawing.FontStyle]::Bold)
  $fontStatLbl = New-Object System.Drawing.Font("Arial", 14, [System.Drawing.FontStyle]::Regular)
  $stats = @(
    @("72t",   "Egenberedskap"),
    @("100%",  "Offline-klar"),
    @("0 kr",  "Alltid gratis"),
    @("DSB",   "Godkjent innhold")
  )
  $sx = 54
  foreach ($s in $stats) {
    $g.DrawString($s[0], $fontStatVal, $white, (New-Object System.Drawing.PointF($sx, 432)))
    $g.DrawString($s[1], $fontStatLbl, $muted, (New-Object System.Drawing.PointF($sx, 460)))
    $sx += 170
  }

  # URL bottom-right
  $sfBR = New-Object System.Drawing.StringFormat
  $sfBR.Alignment     = [System.Drawing.StringAlignment]::Far
  $sfBR.LineAlignment = [System.Drawing.StringAlignment]::Far
  $fontUrl = New-Object System.Drawing.Font("Arial", 26, [System.Drawing.FontStyle]::Bold)
  $g.DrawString("72klar.no", $fontUrl, $red, (New-Object System.Drawing.RectangleF(0, 0, ($w - 44), ($h - 34))), $sfBR)

  $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "  [OK] $path"
}

$base = "c:\Fisnik 72klar\72klar"
Write-Host "Generating 72klar assets..."
Save-Icon    -size 192  -path "$base\icon-192.png"
Save-Icon    -size 512  -path "$base\icon-512.png"
Save-OGImage             -path "$base\og-image.png"
Write-Host "Done."

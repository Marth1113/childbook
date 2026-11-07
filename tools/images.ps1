# 画像の書き出し：powershell -ExecutionPolicy Bypass -File tools/images.ps1
# assets/characters, assets/originals から assets/web/ に Web 用サイズを生成する
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$web = Join-Path $root 'assets\web'
New-Item -ItemType Directory -Force "$web\characters", "$web\icons", "$web\og" | Out-Null

$jpgCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
function Save-Jpeg($bmp, $path, $q = 85) {
  $ep = New-Object System.Drawing.Imaging.EncoderParameters 1
  $ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), ([long]$q)
  $bmp.Save($path, $jpgCodec, $ep)
}
function Resize($src, $w, $h, $cropX = 0, $cropY = 0, $cropW = 0, $cropH = 0) {
  $img = [System.Drawing.Image]::FromFile($src)
  if ($cropW -eq 0) { $cropW = $img.Width; $cropH = $img.Height }
  if ($h -eq 0) { $h = [int][Math]::Round($w * $cropH / $cropW) }
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.DrawImage($img, (New-Object System.Drawing.Rectangle 0, 0, $w, $h), (New-Object System.Drawing.Rectangle $cropX, $cropY, $cropW, $cropH), [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose(); $img.Dispose()
  return $bmp
}

# characters
Get-ChildItem "$root\assets\characters\*.jpg" | ForEach-Object {
  $id = $_.BaseName -replace '_', '-'
  $b = Resize $_.FullName 600 0; Save-Jpeg $b "$web\characters\$id-600.jpg" 84; $b.Dispose()
}
$b = Resize "$root\assets\characters\pocke.jpg" 300 300; Save-Jpeg $b "$web\characters\pocke-300.jpg" 85; $b.Dispose()

# key visual
$b = Resize "$root\assets\originals\key_visual.jpg" 1344 0; Save-Jpeg $b "$web\key-visual.jpg" 86; $b.Dispose()
$b = Resize "$root\assets\originals\key_visual.jpg" 960 0; Save-Jpeg $b "$web\key-visual-960.jpg" 82; $b.Dispose()

# icons（円の部分を切り抜き）
$icon = "$root\assets\originals\icon_pocke.jpg"
foreach ($s in @(@{n = 'favicon-32.png'; w = 32 }, @{n = 'favicon-48.png'; w = 48 }, @{n = 'apple-touch-icon.png'; w = 180 }, @{n = 'icon-192.png'; w = 192 }, @{n = 'icon-512.png'; w = 512 })) {
  $b = Resize $icon $s.w $s.w 72 72 880 880
  $b.Save("$web\icons\$($s.n)", [System.Drawing.Imaging.ImageFormat]::Png); $b.Dispose()
}
Write-Output 'images done'

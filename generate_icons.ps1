Add-Type -AssemblyName System.Drawing

$sourcePath = "public\eat-and-drink.png"
if (-not (Test-Path $sourcePath)) {
    $sourcePath = "C:\Users\shaik\Downloads\eat and drink.png"
}

$sourceImg = [System.Drawing.Image]::FromFile((Resolve-Path $sourcePath).Path)

# Create icons directory if not exists
if (-not (Test-Path "public\icons")) {
    New-Item -ItemType Directory -Path "public\icons" | Out-Null
}

function Generate-Icon {
    param(
        [string]$outputPath,
        [int]$size,
        [double]$scaleFactor = 0.85,
        [bool]$isMaskable = $false
    )

    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    # Fill clean white background
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.FillRectangle($brush, 0, 0, $size, $size)
    $brush.Dispose()

    # Calculate scaled dimensions maintaining aspect ratio
    $srcW = $sourceImg.Width
    $srcH = $sourceImg.Height
    $targetMax = $size * $scaleFactor

    $ratio = [Math]::Min($targetMax / $srcW, $targetMax / $srcH)
    $destW = [int]($srcW * $ratio)
    $destH = [int]($srcH * $ratio)
    $destX = [int](($size - $destW) / 2)
    $destY = [int](($size - $destH) / 2)

    $g.DrawImage($sourceImg, $destX, $destY, $destW, $destH)
    $g.Dispose()

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "Generated: $outputPath ($size x $size)"
}

# Standard Sizes
$sizes = @(512, 384, 192, 180, 152, 144, 128, 96, 72, 48, 32, 16)
foreach ($s in $sizes) {
    Generate-Icon -outputPath "public\icons\icon-$s`x$s.png" -size $s -scaleFactor 0.85
    if ($s -eq 512 -or $s -eq 192 -or $s -eq 180) {
        Generate-Icon -outputPath "public\icon-$s`x$s.png" -size $s -scaleFactor 0.85
    }
}

# Maskable Icons (safe zone 75% so nothing is cropped by circular/squircle Android masks)
Generate-Icon -outputPath "public\icons\maskable-icon-512x512.png" -size 512 -scaleFactor 0.75 -isMaskable $true
Generate-Icon -outputPath "public\icons\maskable-icon-192x192.png" -size 192 -scaleFactor 0.75 -isMaskable $true
Generate-Icon -outputPath "public\maskable-icon-512x512.png" -size 512 -scaleFactor 0.75 -isMaskable $true
Generate-Icon -outputPath "public\maskable-icon-192x192.png" -size 192 -scaleFactor 0.75 -isMaskable $true

# Favicon PNG and Apple Touch Icon
Generate-Icon -outputPath "public\favicon.png" -size 64 -scaleFactor 0.90
Generate-Icon -outputPath "public\apple-touch-icon.png" -size 180 -scaleFactor 0.85

$sourceImg.Dispose()
Write-Output "All icons generated successfully!"

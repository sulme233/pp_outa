Add-Type -AssemblyName System.Drawing

function Create-Icon {
    param([int]$Size, [string]$OutputPath)

    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $rect = New-Object System.Drawing.Rectangle(0, 0, $Size, $Size)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(16, 163, 127),
        [System.Drawing.Color]::FromArgb(26, 127, 100),
        [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
    )

    $graphics.FillRectangle($brush, $rect)

    $font = New-Object System.Drawing.Font("Arial", ($Size * 0.5), [System.Drawing.FontStyle]::Bold)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $stringFormat = New-Object System.Drawing.StringFormat
    $stringFormat.Alignment = [System.Drawing.StringAlignment]::Center
    $stringFormat.LineAlignment = [System.Drawing.StringAlignment]::Center

    $textRect = New-Object System.Drawing.RectangleF(0, 0, $Size, $Size)
    $graphics.DrawString("$", $font, $textBrush, $textRect, $stringFormat)

    $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $graphics.Dispose()
    $bitmap.Dispose()
}

$iconDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Create-Icon -Size 16 -OutputPath "$iconDir\icon16.png"
Create-Icon -Size 48 -OutputPath "$iconDir\icon48.png"
Create-Icon -Size 128 -OutputPath "$iconDir\icon128.png"

Write-Host "Icons created successfully!"

Add-Type -AssemblyName System.Drawing

$width = 1200
$height = 820
$bitmap = [System.Drawing.Bitmap]::new($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#f3f5f7'))

function Brush([string] $color) {
  return [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($color))
}

function Pen([string] $color, [float] $width) {
  $pen = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml($color), $width)
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  return $pen
}

function RoundedPath([float] $x, [float] $y, [float] $w, [float] $h, [float] $r) {
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function FillRound([float] $x, [float] $y, [float] $w, [float] $h, [float] $r, [string] $color) {
  $path = RoundedPath $x $y $w $h $r
  $brush = Brush $color
  $graphics.FillPath($brush, $path)
  $brush.Dispose()
  $path.Dispose()
}

function DrawCard([int] $x, [int] $y, [string] $tileColor, [string] $label) {
  FillRound $x $y 320 270 18 '#ffffff'
  $border = Pen '#dfe3e7' 1
  $cardPath = RoundedPath $x $y 320 270 18
  $graphics.DrawPath($border, $cardPath)
  $border.Dispose()
  $cardPath.Dispose()
  FillRound ($x + 70) ($y + 28) 180 180 42 $tileColor
  $font = [System.Drawing.Font]::new('Segoe UI', 18, [System.Drawing.FontStyle]::Bold)
  $format = [System.Drawing.StringFormat]::new()
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $labelBrush = Brush '#43505b'
  $graphics.DrawString($label, $font, $labelBrush, [System.Drawing.RectangleF]::new($x, $y + 226, 320, 32), $format)
  $labelBrush.Dispose()
  $format.Dispose()
  $font.Dispose()
}

$titleFont = [System.Drawing.Font]::new('Segoe UI', 34, [System.Drawing.FontStyle]::Bold)
$subFont = [System.Drawing.Font]::new('Segoe UI', 18)
$titleBrush = Brush '#17212b'
$subBrush = Brush '#687078'
$graphics.DrawString('SuiteMind icon concepts', $titleFont, $titleBrush, 70, 42)
$graphics.DrawString('Six simple directions designed for Word toolbar sizes', $subFont, $subBrush, 70, 91)
$titleBrush.Dispose()
$subBrush.Dispose()
$titleFont.Dispose()
$subFont.Dispose()

DrawCard 70 155 '#173a55' '01  Ribbon S'
DrawCard 440 155 '#2878bd' '02  Smart polish'
DrawCard 810 155 '#eef4f0' '03  Review check'
DrawCard 70 475 '#15545b' '04  Text cursor'
DrawCard 440 475 '#263746' '05  Before / after'
DrawCard 810 475 '#f6f0df' '06  Pen approval'

# 01 Ribbon S
FillRound 185 205 70 31 8 '#36a86b'
FillRound 185 205 31 76 8 '#36a86b'
FillRound 244 304 70 31 8 '#36a86b'
FillRound 283 259 31 76 8 '#36a86b'
FillRound 216 236 75 31 8 '#55a8dc'
FillRound 283 236 31 50 8 '#55a8dc'
FillRound 216 273 75 31 8 '#f0b83d'
FillRound 185 254 31 50 8 '#f0b83d'

# 02 Smart polish
FillRound 540 217 114 128 10 '#ffffff'
$fold = Brush '#dceefa'
$graphics.FillPolygon($fold, @([System.Drawing.Point]::new(623,217), [System.Drawing.Point]::new(654,248), [System.Drawing.Point]::new(623,248)))
$fold.Dispose()
FillRound 563 261 57 9 4.5 '#2878bd'
FillRound 563 283 68 9 4.5 '#2878bd'
$polishPen = Pen '#28a66a' 13
$graphics.DrawBezier($polishPen, 556, 319, 580, 318, 612, 304, 640, 288)
$polishPen.Dispose()
$spark = Brush '#28a66a'
$graphics.FillPolygon($spark, @([System.Drawing.Point]::new(635,275), [System.Drawing.Point]::new(641,287), [System.Drawing.Point]::new(653,293), [System.Drawing.Point]::new(641,299), [System.Drawing.Point]::new(635,311), [System.Drawing.Point]::new(629,299), [System.Drawing.Point]::new(617,293), [System.Drawing.Point]::new(629,287)))
$spark.Dispose()

# 03 Review check
$bracketPen = Pen '#213746' 15
$graphics.DrawLines($bracketPen, [System.Drawing.Point[]]@([System.Drawing.Point]::new(935,225), [System.Drawing.Point]::new(913,225), [System.Drawing.Point]::new(913,321), [System.Drawing.Point]::new(935,321)))
$graphics.DrawLines($bracketPen, [System.Drawing.Point[]]@([System.Drawing.Point]::new(1005,225), [System.Drawing.Point]::new(1027,225), [System.Drawing.Point]::new(1027,321), [System.Drawing.Point]::new(1005,321)))
$bracketPen.Dispose()
$checkPen = Pen '#23945b' 17
$graphics.DrawLines($checkPen, [System.Drawing.Point[]]@([System.Drawing.Point]::new(936,276), [System.Drawing.Point]::new(961,302), [System.Drawing.Point]::new(1009,248)))
$checkPen.Dispose()

# 04 Text cursor
FillRound 180 548 67 13 6.5 '#ffffff'
FillRound 180 576 90 13 6.5 '#ffffff'
FillRound 180 604 54 13 6.5 '#ffffff'
FillRound 247 540 10 92 5 '#ff745f'
$cursorBrush = Brush '#ff745f'
$graphics.FillEllipse($cursorBrush, 244, 635, 16, 16)
$cursorBrush.Dispose()

# 05 Before / after
FillRound 544 547 62 88 8 '#9aa9b4'
FillRound 594 533 62 106 8 '#ffffff'
FillRound 610 557 30 8 4 '#2e8bc0'
FillRound 610 577 30 8 4 '#2e8bc0'
FillRound 610 597 23 8 4 '#2e8bc0'
$arrowPen = Pen '#36a86b' 10
$graphics.DrawLine($arrowPen, 556, 652, 639, 652)
$arrowPen.Dispose()
$arrowBrush = Brush '#36a86b'
$graphics.FillPolygon($arrowBrush, @([System.Drawing.Point]::new(631,640), [System.Drawing.Point]::new(647,652), [System.Drawing.Point]::new(631,664)))
$arrowBrush.Dispose()

# 06 Pen approval
$nib = Brush '#225c78'
$graphics.FillPolygon($nib, @([System.Drawing.Point]::new(970,533), [System.Drawing.Point]::new(1015,578), [System.Drawing.Point]::new(970,650), [System.Drawing.Point]::new(925,578)))
$nib.Dispose()
$nibLine = Pen '#f6f0df' 10
$graphics.DrawLine($nibLine, 970, 533, 970, 607)
$nibLine.Dispose()
$holeBrush = Brush '#f6f0df'
$graphics.FillEllipse($holeBrush, 958, 600, 24, 24)
$holeBrush.Dispose()
$approvalPen = Pen '#2a9a61' 15
$graphics.DrawLines($approvalPen, [System.Drawing.Point[]]@([System.Drawing.Point]::new(928,641), [System.Drawing.Point]::new(948,661), [System.Drawing.Point]::new(993,616)))
$approvalPen.Dispose()
$gold = Brush '#e8ae31'
$graphics.FillEllipse($gold, 1003, 538, 24, 24)
$gold.Dispose()

$output = Join-Path $PSScriptRoot '..\design\suitemind-icon-concepts.png'
$bitmap.Save([System.IO.Path]::GetFullPath($output), [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()

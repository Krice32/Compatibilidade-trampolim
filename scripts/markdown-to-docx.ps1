param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$OutputPath
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression

function Escape-Xml([string]$Text) {
  return [System.Security.SecurityElement]::Escape($Text)
}

function New-RunXml([string]$Text, [bool]$Bold = $false, [bool]$Code = $false) {
  if ([string]::IsNullOrEmpty($Text)) { return '' }
  $properties = @()
  if ($Bold) { $properties += '<w:b/>' }
  if ($Code) { $properties += '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="19"/><w:color w:val="333333"/>' }
  $runProperties = if ($properties.Count) { '<w:rPr>' + ($properties -join '') + '</w:rPr>' } else { '' }
  return '<w:r>' + $runProperties + '<w:t xml:space="preserve">' + (Escape-Xml $Text) + '</w:t></w:r>'
}

function Convert-InlineMarkdown([string]$Text) {
  $result = [System.Text.StringBuilder]::new()
  $pattern = '(\*\*[^*]+\*\*|`[^`]+`)'
  $cursor = 0
  foreach ($match in [regex]::Matches($Text, $pattern)) {
    if ($match.Index -gt $cursor) { [void]$result.Append((New-RunXml $Text.Substring($cursor, $match.Index - $cursor))) }
    if ($match.Value.StartsWith('**')) {
      [void]$result.Append((New-RunXml $match.Value.Substring(2, $match.Value.Length - 4) $true $false))
    } else {
      [void]$result.Append((New-RunXml $match.Value.Substring(1, $match.Value.Length - 2) $false $true))
    }
    $cursor = $match.Index + $match.Length
  }
  if ($cursor -lt $Text.Length) { [void]$result.Append((New-RunXml $Text.Substring($cursor))) }
  return $result.ToString()
}

function New-ParagraphXml([string]$Text, [string]$Style = '', [int]$NumberingId = 0, [int]$Level = 0, [bool]$CodeBlock = $false) {
  $properties = [System.Text.StringBuilder]::new()
  if ($Style) { [void]$properties.Append('<w:pStyle w:val="' + $Style + '"/>') }
  if ($NumberingId -gt 0) { [void]$properties.Append('<w:numPr><w:ilvl w:val="' + $Level + '"/><w:numId w:val="' + $NumberingId + '"/></w:numPr>') }
  if ($CodeBlock) { [void]$properties.Append('<w:shd w:val="clear" w:color="auto" w:fill="F3F3F3"/><w:spacing w:before="60" w:after="60"/>') }
  $paragraphProperties = if ($properties.Length) { '<w:pPr>' + $properties.ToString() + '</w:pPr>' } else { '' }
  $runs = if ($CodeBlock) { New-RunXml $Text $false $true } else { Convert-InlineMarkdown $Text }
  return '<w:p>' + $paragraphProperties + $runs + '</w:p>'
}

function New-TableXml([string[]]$Rows) {
  $parsed = @()
  foreach ($row in $Rows) {
    $trimmed = $row.Trim().Trim('|')
    $parsed += ,($trimmed -split '\|' | ForEach-Object { $_.Trim() })
  }
  if ($parsed.Count -gt 1 -and (($parsed[1] -join '') -match '^[-:]+$')) {
    $parsed = @($parsed[0]) + @($parsed[2..($parsed.Count - 1)])
  }
  if (-not $parsed.Count) { return '' }
  $columnCount = ($parsed | ForEach-Object { $_.Count } | Measure-Object -Maximum).Maximum
  $cellWidth = [math]::Floor(9000 / [math]::Max(1, $columnCount))
  $xml = [System.Text.StringBuilder]::new()
  [void]$xml.Append('<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="D9D5D2"/><w:left w:val="single" w:sz="4" w:color="D9D5D2"/><w:bottom w:val="single" w:sz="4" w:color="D9D5D2"/><w:right w:val="single" w:sz="4" w:color="D9D5D2"/><w:insideH w:val="single" w:sz="4" w:color="D9D5D2"/><w:insideV w:val="single" w:sz="4" w:color="D9D5D2"/></w:tblBorders></w:tblPr>')
  for ($rowIndex = 0; $rowIndex -lt $parsed.Count; $rowIndex++) {
    [void]$xml.Append('<w:tr>')
    for ($columnIndex = 0; $columnIndex -lt $columnCount; $columnIndex++) {
      $cell = if ($columnIndex -lt $parsed[$rowIndex].Count) { $parsed[$rowIndex][$columnIndex] } else { '' }
      $shade = if ($rowIndex -eq 0) { '<w:shd w:val="clear" w:color="auto" w:fill="EDEAE8"/>' } else { '' }
      $cellRun = if ($rowIndex -eq 0) { New-RunXml $cell $true $false } else { Convert-InlineMarkdown $cell }
      [void]$xml.Append('<w:tc><w:tcPr><w:tcW w:w="' + $cellWidth + '" w:type="dxa"/>' + $shade + '<w:tcMar><w:top w:w="90" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="90" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar></w:tcPr><w:p>' + $cellRun + '</w:p></w:tc>')
    }
    [void]$xml.Append('</w:tr>')
  }
  [void]$xml.Append('</w:tbl>')
  return $xml.ToString()
}

function Add-ZipTextEntry($Archive, [string]$Path, [string]$Content) {
  $entry = $Archive.CreateEntry($Path, [System.IO.Compression.CompressionLevel]::Optimal)
  $stream = $entry.Open()
  $writer = [System.IO.StreamWriter]::new($stream, [System.Text.UTF8Encoding]::new($false))
  try { $writer.Write($Content) } finally { $writer.Dispose(); $stream.Dispose() }
}

$resolvedInput = (Resolve-Path -LiteralPath $InputPath).Path
$resolvedOutput = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
$outputDirectory = [System.IO.Path]::GetDirectoryName($resolvedOutput)
if (-not [System.IO.Directory]::Exists($outputDirectory)) { [System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null }

$lines = [System.IO.File]::ReadAllLines($resolvedInput, [System.Text.Encoding]::UTF8)
$body = [System.Text.StringBuilder]::new()
$inCode = $false
$tableRows = [System.Collections.Generic.List[string]]::new()

function Flush-Table {
  if ($tableRows.Count) {
    [void]$body.Append((New-TableXml $tableRows.ToArray()))
    $tableRows.Clear()
  }
}

foreach ($line in $lines) {
  if ($line.Trim().StartsWith('```')) {
    Flush-Table
    $inCode = -not $inCode
    continue
  }
  if ($inCode) {
    [void]$body.Append((New-ParagraphXml $line '' 0 0 $true))
    continue
  }
  if ($line.Trim().StartsWith('|')) {
    $tableRows.Add($line)
    continue
  }
  Flush-Table
  if ([string]::IsNullOrWhiteSpace($line)) { continue }
  if ($line -match '^(#{1,4})\s+(.+)$') {
    $style = 'Heading' + $matches[1].Length
    [void]$body.Append((New-ParagraphXml $matches[2] $style))
  } elseif ($line -match '^\s*-\s+(.+)$') {
    [void]$body.Append((New-ParagraphXml $matches[1] '' 1))
  } elseif ($line -match '^\s*\d+\.\s+(.+)$') {
    [void]$body.Append((New-ParagraphXml $matches[1] '' 2))
  } else {
    [void]$body.Append((New-ParagraphXml $line))
  }
}
Flush-Table

$contentTypes = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>
'@

$rootRels = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
'@

$documentRels = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>
'@

$styles = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="22"/><w:lang w:val="pt-BR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:pageBreakBefore/><w:spacing w:before="240" w:after="180"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="D71920"/><w:sz w:val="34"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="260" w:after="100"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:color w:val="231F20"/><w:sz w:val="28"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="180" w:after="80"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:color w:val="333333"/><w:sz w:val="24"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading4"><w:name w:val="heading 4"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="140" w:after="60"/><w:outlineLvl w:val="3"/></w:pPr><w:rPr><w:b/><w:sz w:val="22"/></w:rPr></w:style>
</w:styles>
'@

$numbering = @'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:tabs><w:tab w:val="num" w:pos="540"/></w:tabs><w:ind w:left="540" w:hanging="260"/></w:pPr></w:lvl></w:abstractNum>
  <w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:tabs><w:tab w:val="num" w:pos="540"/></w:tabs><w:ind w:left="540" w:hanging="260"/></w:pPr></w:lvl></w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
  <w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>
'@

$now = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH:mm:ssZ')
$core = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Documentação funcional e técnica do projeto Trampolim</dc:title><dc:creator>Projeto Trampolim</dc:creator><dc:subject>Currículos, vagas, compatibilidade e processo seletivo</dc:subject><dcterms:created xsi:type="dcterms:W3CDTF">' + $now + '</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">' + $now + '</dcterms:modified></cp:coreProperties>'
$app = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Microsoft Office Word</Application><AppVersion>16.0000</AppVersion></Properties>'
$document = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + $body.ToString() + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>'

if ([System.IO.File]::Exists($resolvedOutput)) { [System.IO.File]::Delete($resolvedOutput) }
$fileStream = [System.IO.File]::Open($resolvedOutput, [System.IO.FileMode]::CreateNew)
$archive = [System.IO.Compression.ZipArchive]::new($fileStream, [System.IO.Compression.ZipArchiveMode]::Create, $false)
try {
  Add-ZipTextEntry $archive '[Content_Types].xml' $contentTypes
  Add-ZipTextEntry $archive '_rels/.rels' $rootRels
  Add-ZipTextEntry $archive 'word/document.xml' $document
  Add-ZipTextEntry $archive 'word/styles.xml' $styles
  Add-ZipTextEntry $archive 'word/numbering.xml' $numbering
  Add-ZipTextEntry $archive 'word/_rels/document.xml.rels' $documentRels
  Add-ZipTextEntry $archive 'docProps/core.xml' $core
  Add-ZipTextEntry $archive 'docProps/app.xml' $app
} finally {
  $archive.Dispose()
  $fileStream.Dispose()
}

Write-Output $resolvedOutput

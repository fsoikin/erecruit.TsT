[CmdletBinding()]
param( [Parameter(Mandatory=$false)] [Switch] $Dbg = $false )

$Config = if ($Dbg) {"Debug"} else {"Release"}

jake
& "C:\Program Files (x86)\MSBuild\14.0\bin\MSBuild.exe" /p:Configuration=$Config /t:Rebuild
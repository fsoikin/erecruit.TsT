Param( [string] $Configuration )
if ( -not $Configuration ) { exit 1; }
$myDir = split-path -parent $MyInvocation.MyCommand.Definition

function Main {
	$tmpDir = "$myDir\bin\tmp"

	if ( -not (test-path $tmpDir) ) { md $tmpDir }
	del "$tmpDir\*" -Force

	@( "tstc\bin\$Configuration", "vs\bin\vsix" ) | 
		% { dir "$myDir\..\$_\*" -Include *.dll,*.exe,*.vsixmanifest,*.pkgdef -Exclude *vshost* -Recurse } |
		copy -Destination $tmpDir -Force

	$binFiles = files $tmpDir "tstc\bin\$Configuration" 'c'
	$vsixFiles12 = files $tmpDir "vs\bin\vsix" 'vs12'
	$vsixFiles14 = files $tmpDir "vs\bin\vsix" 'vs14'

	cat "$myDir\files.template" | 
		%{ $_ -replace "<!-- BINFILES -->", $binFiles } | 
		%{ $_ -replace "<!-- VSIXFILES12 -->", $vsixFiles12 } | 
		%{ $_ -replace "<!-- VSIXFILES14 -->", $vsixFiles14 } | 
		Set-Content "$myDir\files.wxs"
}

function files( [string]$tmpDir, [string]$existsIn, [string] $idSuffix ) {
	dir $tmpDir |
	? { test-path "$myDir\..\$existsIn\$($_.Name)" } |
	%{ 
		"<File Name=`"$($_.Name)`" Source=`"`$(var.ProjectDir)bin\tmp\$($_.Name)`" Id=`"$($_.Name -replace "[^A-Za-z0-9_\.]", "_")_$idSuffix`" />`n`t`t`t" 
	};
}

Main;
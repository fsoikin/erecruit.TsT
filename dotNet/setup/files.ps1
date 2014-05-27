Param( [string] $Configuration )
if ( -not $Configuration ) { exit 1; }
$myDir = split-path -parent $MyInvocation.MyCommand.Definition

function Main {
	$tmpDir = "$myDir\bin\tmp"

	if ( -not (test-path $tmpDir) ) { md $tmpDir }
	del "$tmpDir\*" -Force

	@( "tstc", "vs" ) | 
		% { dir "$myDir\..\$_\bin\$Configuration\*" -Include *.dll,*.exe,*.vsixmanifest -Exclude *vshost* } |
		copy -Destination $tmpDir -Force

	$binFiles = files $tmpDir 'tstc'
	$vsixFiles = files $tmpDir 'vs'

	cat "$myDir\files.template" | 
		%{ $_ -replace "<!-- BINFILES -->", $binFiles } | 
		%{ $_ -replace "<!-- VSIXFILES -->", $vsixFiles } | 
		Set-Content "$myDir\files.wxs"
}

function files( [string]$tmpDir, [string]$existsIn ) {
	dir $tmpDir |
	? { test-path "$myDir\..\$existsIn\bin\$Configuration\$($_.Name)" } |
	%{ 
		"<File Name=`"$($_.Name)`" Source=`"`$(var.ProjectDir)bin\tmp\$($_.Name)`" Id=`"$($_.Name -replace "[^A-Za-z0-9_\.]", "_")_$existsIn`" />`n`t`t`t" 
	};
}

Main;
using System;
using System.Linq;
using System.Diagnostics;
using System.Globalization;
using System.Runtime.InteropServices;
using System.ComponentModel.Design;
using Microsoft.Win32;
using Microsoft.VisualStudio;
using Microsoft.VisualStudio.Shell.Interop;
using Microsoft.VisualStudio.OLE.Interop;
using Microsoft.VisualStudio.Shell;
using EnvDTE80;
using EnvDTE;
using System.Collections.Generic;
using System.IO;
using System.Reactive.Linq;
using System.Reactive.Concurrency;
using System.Reactive;

namespace erecruit.vs
{
	[PackageRegistration( UseManagedResourcesOnly = true )]
	[InstalledProductRegistration( "#110", "#112", "1.0", IconResourceID = 400 )]
	[ProvideMenuResource( "Menus.ctmenu", 1 )]
	[Guid( GuidList.guidvsPkgString )]
	public sealed class TsTPackage : Package
	{
		const string TypeScriptExtension = ".ts";
		const string ConfigFileName = ".tstconfig";

		protected override void Initialize() {
			base.Initialize();

			_dte = GetService( typeof( DTE ) ) as DTE2;
			var menu = GetService( typeof( IMenuCommandService ) ) as IMenuCommandService;
			var cmd = new OleMenuCommand( ( s, e ) => AttachTranslator(), new CommandID( GuidList.guidvsCmdSet, (int)PkgCmdIDList.cmdidAddTranslated ) );
			cmd.BeforeQueryStatus += ( s, e ) => BeforeQueryStatus( s as OleMenuCommand );
			menu.AddCommand( cmd );
		}

		void AttachTranslator() {
			Translate( GetFiles( GetSelectedItems() ) );
		}

		void Translate( IEnumerable<File> inputFiles ) {
			var files = inputFiles.ToList();
			var items = files.ToLookup( x => x.Path, StringComparer.InvariantCultureIgnoreCase );
			var configs = files.ToLookup( x => FindConfigFor( x.Path ) );

			var noConfigs = configs[""];
			if ( noConfigs.Any() ) {
				_dte.StatusBar.Text = "Cannot find .tstconfig for path " + noConfigs.First().Path;
				return;
			}
			
			var tst = new TsT.TsT();
			var tstHost = new TsT.Host( System.IO.Path.GetDirectoryName( _dte.Solution.FullName ) );
			var process = from filesPerConfig in configs.ToObservable()
										from configContents in ReadContents( filesPerConfig.Key )
										let configDir = Path.GetDirectoryName( filesPerConfig.Key )

										from result in tst.Emit( configDir, configContents, filesPerConfig.Select( x => x.Path ).ToArray(), tstHost )

										let item = result.SourceFiles.SelectMany( sf => items[sf] ).FirstOrDefault()
										where item != null // This shouldn't happen, but just in case it does, bail out

										let outFile = Path.GetFullPath( Path.Combine( configDir, result.OutputFile ) )
										from written in WriteContents( outFile, result.Content )
										from included in IncludeInProjectIfNotThere( item.Item, outFile )

										select result.OutputFile;

			process.Subscribe( s => _dte.StatusBar.Text = "Generated " + s, ex => _dte.StatusBar.Text = ex.ToString() );
		}

		void BeforeQueryStatus( OleMenuCommand cmd ) {
			cmd.Enabled = GetSelectedFiles().Select( f => f.Path.EndsWith( TypeScriptExtension ) ).DefaultIfEmpty( false ).First();
		}

		IEnumerable<ProjectItem> GetSelectedItems() {
			for ( short j = 1; j <= _dte.SelectedItems.Count; j++ ) yield return _dte.SelectedItems.Item( j ).ProjectItem;
		}

		IEnumerable<ProjectItem> GetItems( ProjectItems items ) {
			for ( short j = 1; j <= items.Count; j++ ) yield return items.Item( j );
		}

		IEnumerable<File> GetFiles( IEnumerable<ProjectItem> items ) {
			foreach ( var item in items ) {
				for ( short i = 1; i <= item.FileCount; i++ ) {
					yield return new File { Path = item.FileNames[i], Item = item };
				}
			}
		}

		IEnumerable<File> GetSelectedFiles() { return GetFiles( GetSelectedItems() ); }

		string FindConfigFor( string path ) {
			return GetDirsUp( Path.GetDirectoryName( path ) )
				.Select( d => Path.Combine( d, ConfigFileName ) )
				.FirstOrDefault( System.IO.File.Exists )
				?? "";
		}

		IEnumerable<string> GetDirsUp( string mostNestedDirPath ) {
			var path = mostNestedDirPath;
			while ( !string.IsNullOrWhiteSpace( path ) ) {
				yield return path;
				path = Path.GetDirectoryName( path );
			}
		}

		IObservable<string> ReadContents( string path ) {
			return Observable.Using(
				() => System.IO.File.OpenText( path ),
				str => Observable.FromAsync( str.ReadToEndAsync ) );
		}

		IObservable<Unit> WriteContents( string path, string contents ) {
			return Observable.Using(
				() => System.IO.File.CreateText( path ),
				str => Observable.FromAsync( async () => await str.WriteAsync( contents ) ) );
		}

		IEnumerable<int> IncludeInProjectIfNotThere( ProjectItem item, string file ) {
			if ( !GetFiles( GetItems( item.ProjectItems ) ).Any( x => string.Equals( x.Path, file, StringComparison.InvariantCultureIgnoreCase ) ) ) {
				item.ProjectItems.AddFromFile( file );
			}
			yield return 0;
		}

		class File
		{
			public string Path { get; set; }
			public ProjectItem Item { get; set; }
		}

		DTE2 _dte;
	}
}
using System;
using System.Collections.Generic;
using System.ComponentModel.Design;
using System.IO;
using System.Linq;
using System.Reactive.Linq;
using System.Runtime.InteropServices;
using EnvDTE;
using EnvDTE80;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;

namespace erecruit.vs
{
	[PackageRegistration( UseManagedResourcesOnly = true )]
	[InstalledProductRegistration( "#110", "#112", "1.0", IconResourceID = 400 )]
	[ProvideMenuResource( "Menus.ctmenu", 1 )]
	[ProvideAutoLoad( UIContextGuids80.SolutionExists )]
	[Guid( GuidList.guidvsPkgString )]
	public sealed class TsTPackage : Package
	{
		const string TypeScriptExtension = ".ts";
		const string ConfigFileName = ".tstconfig";
		const string TranslateFlagName = "TsT_Translate";

		protected override void Initialize() {
			base.Initialize();

			_dte = GetService( typeof( DTE ) ) as DTE2;
			var menu = GetService( typeof( IMenuCommandService ) ) as IMenuCommandService;
			var cmd = new OleMenuCommand( ( s, e ) => AttachTranslator(), new CommandID( GuidList.guidvsCmdSet, (int)PkgCmdIDList.cmdidAddTranslated ) );
			cmd.BeforeQueryStatus += ( s, e ) => BeforeQueryStatus( s as OleMenuCommand );
			menu.AddCommand( cmd );
		}

		void AttachTranslator() {
			Translate( GetFiles( GetSelectedItems() ).Where( x => x.Path.EndsWith( TypeScriptExtension ) ) );
		}

		void Translate( IEnumerable<File> inputFiles ) {
			var files = inputFiles.ToList();
			var items = files.ToLookup( x => x.Path, x => x.Item, StringComparer.InvariantCultureIgnoreCase );
			var solutionDir = System.IO.Path.GetDirectoryName( _dte.Solution.FullName );

			(from g in TsT.TsT.Generate( files.Select( x => x.Path ), solutionDir, ConfigFileName )
			 let item = g.SourceFiles.SelectMany( x => items[x] ).FirstOrDefault()
			 from _ in IncludeInProjectIfNotThere( item, g.OutputFile )
			 select g
			).Subscribe( 
				f => _dte.StatusBar.Text = "Generated " + f.OutputFile, 
				ex => _dte.StatusBar.Text = ex.Message );
		}

		void BeforeQueryStatus( OleMenuCommand cmd ) {
			cmd.Enabled = GetSelectedFiles()
				.Select( f => f.Path.EndsWith( TypeScriptExtension ) && !GetTranslateFlag( f.Item ) )
				.DefaultIfEmpty( false ).First();
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

		IEnumerable<int> IncludeInProjectIfNotThere( ProjectItem item, string file ) {
			if ( item != null ) {
				SetTranslateFlag( item, true );
				var subItems = GetFiles( GetItems( item.ProjectItems ) ).ToList();
				if ( !subItems.Any( x => string.Equals( x.Path, file, StringComparison.InvariantCultureIgnoreCase ) ) ) {
					item.ProjectItems.AddFromFile( file );
				}
			}
			yield return 0;
		}

		public static void SetTranslateFlag( ProjectItem item, bool flag ) {
			IVsHierarchy hierarchy;
			uint itemID;
			IVsSolution solution = (IVsSolution)Package.GetGlobalService( typeof( SVsSolution ) );
			solution.GetProjectOfUniqueName( item.ContainingProject.UniqueName, out hierarchy );
			hierarchy.ParseCanonicalName( item.FileNames[0], out itemID );
			(hierarchy as IVsBuildPropertyStorage).SetItemAttribute( itemID, TranslateFlagName, flag.ToString() );
		}

		public static bool GetTranslateFlag( ProjectItem item ) {
			IVsHierarchy hierarchy;
			uint itemID;
			string result;
			IVsSolution solution = (IVsSolution)Package.GetGlobalService( typeof( SVsSolution ) );
			solution.GetProjectOfUniqueName( item.ContainingProject.UniqueName, out hierarchy );
			hierarchy.ParseCanonicalName( item.FileNames[0], out itemID );
			(hierarchy as IVsBuildPropertyStorage).GetItemAttribute( itemID, TranslateFlagName, out result );

			return string.Equals( result, true.ToString(), StringComparison.InvariantCultureIgnoreCase );
		}

		class File
		{
			public string Path { get; set; }
			public ProjectItem Item { get; set; }
		}

		DTE2 _dte;
	}
}
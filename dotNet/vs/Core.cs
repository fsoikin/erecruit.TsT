using System;
using System.Collections.Generic;
using System.Linq;
using System.Reactive.Linq;
using EnvDTE;
using EnvDTE80;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;

namespace erecruit.vs
{
	public static class Core
	{
		public const string TypeScriptExtension = ".ts";
		public const string TranslateFlagName = "TsTranslate";

		public static void Translate( IEnumerable<File> inputFiles ) {
			var dte = (DTE2)Package.GetGlobalService( typeof( SDTE ) );
			var files = inputFiles.ToList();
			var items = files.ToLookup( x => x.Path, x => x.Item, StringComparer.InvariantCultureIgnoreCase );
			var solutionDir = System.IO.Path.GetDirectoryName( dte.Solution.FullName );

			(from g in TsT.TsT.Generate( files.Select( x => x.Path ), solutionDir, TsT.TsT.AutoDiscoverConfigFile() )
			 let item = g.SourceFiles.SelectMany( x => items[x] ).FirstOrDefault()
			 from _ in IncludeInProjectIfNotThere( item, g.OutputFile )
			 select g
			).Subscribe( 
				f => dte.StatusBar.Text = "Generated " + f.OutputFile, 
				ex => dte.StatusBar.Text = ex.Message );
		}

		public static IEnumerable<int> IncludeInProjectIfNotThere( ProjectItem item, string file ) {
			if ( item != null ) {
				SetTranslateFlag( item, true );
				var subItems = GetFiles( GetItems( item.ProjectItems ) ).ToList();
				if ( !subItems.Any( x => string.Equals( x.Path, file, StringComparison.InvariantCultureIgnoreCase ) ) ) {
					item.ProjectItems.AddFromFile( file );
				}
			}
			yield return 0;
		}

		public static IEnumerable<File> GetFiles( IEnumerable<ProjectItem> items ) {
			foreach ( var item in items ) {
				for ( short i = 1; i <= item.FileCount; i++ ) {
					yield return new File { Path = item.FileNames[i], Item = item };
				}
			}
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

		public static IEnumerable<ProjectItem> GetItems( ProjectItems items ) {
			for ( short j = 1; j <= items.Count; j++ ) yield return items.Item( j );
		}

		public static IEnumerable<ProjectItem> GetSelectedItems() {
			var dte = (DTE2)Package.GetGlobalService( typeof( SDTE ) );
			for ( short j = 1; j <= dte.SelectedItems.Count; j++ ) yield return dte.SelectedItems.Item( j ).ProjectItem;
		}

		public static IEnumerable<Core.File> GetSelectedFiles() { return Core.GetFiles( GetSelectedItems() ); }

		public class File
		{
			public string Path { get; set; }
			public ProjectItem Item { get; set; }
		}
	}
}
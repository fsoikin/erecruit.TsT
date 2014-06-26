using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reactive.Linq;
using System.Windows.Forms;
using EnvDTE;
using EnvDTE80;
using Microsoft.VisualStudio;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;

namespace erecruit.vs
{
	public static class Core
	{
		public const string TypeScriptExtension = ".ts";
		public const string TranslateFlagName = "TsTranslate";

		public const string DefaultTemplatesFolder = "TsT-templates";
		public const string DefaultTemplateFileName = "type.cs.tpl";
		public static readonly string[] FoldersForDefaultTemplate = new[] { "scripts", "content" };

		public const string MSBuildTargetsFileRelativePath = "erecruit\\TsT\\erecruit.TsT.targets";
		public const string MSBuildExtensionsPathVariable = "$(MSBuildExtensionsPath32)";

		public static void Translate( IEnumerable<File> inputFiles ) {
			if ( !EnsureConfig( inputFiles ) ) return;
			EnsureMSBuildImport( inputFiles.Select( f => f.Item.ContainingProject ).Distinct() );

			var dte = (DTE2)Package.GetGlobalService( typeof( SDTE ) );
			var files = inputFiles.ToList();
			var items = files.ToLookup( x => x.Path, x => x.Item, StringComparer.InvariantCultureIgnoreCase );
			var solutionDir = System.IO.Path.GetDirectoryName( dte.Solution.FullName );

			// TODO: should use a shared instance of TsT across multiple calls
			Observable.Using( () => new TsT.TsT(), tst =>
			 from g in tst.Emit( files.Select( x => x.Path ), solutionDir, TsT.TsT.AutoDiscoverConfigFile() )

			 let item = g.SourceFiles
									.Select( x => Path.GetFullPath( Path.Combine( solutionDir, x ) ) )
									.SelectMany( x => items[x] )
									.FirstOrDefault()

			 from _ in IncludeInProjectIfNotThere( item, Path.GetFullPath( Path.Combine( solutionDir, g.OutputFile ) ) )
			 select g
			)
			.Select( f => "Generated " + f.OutputFile )
			.Catch( ( Exception ex ) => Observable.Return( ex.Message ) )
			.Subscribe( msg => {
				dte.StatusBar.Text = msg;
				WriteToOutputWindow( msg );
			} );

		}

		static void WriteToOutputWindow( string msg ) {
			var output = Package.GetGlobalService( typeof( SVsOutputWindow ) ) as IVsOutputWindow;
			if ( output == null ) return;

			var paneID = VSConstants.OutputWindowPaneGuid.GeneralPane_guid;
			output.CreatePane( ref paneID, "General", 1, 0 );

			IVsOutputWindowPane pane;
			if ( ErrorHandler.Failed( output.GetPane( ref paneID, out pane ) ) || pane == null ) return;

			pane.OutputString( string.Format( "{0:HH:mm:ss}: erecruit.TsT: {1}{2}", DateTime.Now, msg, Environment.NewLine ) );
		}

		static HashSet<string> _askedAboutImports = new HashSet<string>();
		static void EnsureMSBuildImport( IEnumerable<Project> projs ) {
			var eligibleProjects = projs
				.Where( proj => {
					lock ( _askedAboutImports ) {
						if ( _askedAboutImports.Contains( proj.FullName ) ) return false;
						_askedAboutImports.Add( proj.FullName );
						return true;
					}
				} )
				.Select( proj => Microsoft.Build.Evaluation.ProjectCollection.GlobalProjectCollection.GetLoadedProjects( proj.FullName ).FirstOrDefault() )
				.Where( msbuildProj => msbuildProj != null )
				.Where( msbuildProj => !msbuildProj.Xml.Imports.Any( i => i.Project.IndexOf( MSBuildTargetsFileRelativePath, StringComparison.InvariantCultureIgnoreCase ) >= 0 ) )
				.ToList();

			if ( eligibleProjects.Any() ) {
				var r = MessageBox.Show( Properties.Resources.TargetsImportMissing_Text, Properties.Resources.TargetsImportMissing_Caption, MessageBoxButtons.YesNo, MessageBoxIcon.Question );
				if ( r == DialogResult.Yes ) {
					eligibleProjects.ForEach( p => p.Xml.AddImport( MSBuildExtensionsPathVariable + "\\" + MSBuildTargetsFileRelativePath ) );
				}
			}
		}

		static bool EnsureConfig( IEnumerable<File> inputFiles ) {
			var anyFilesWithoutConfig = inputFiles.Select( f => f.Path ).Select( TsT.TsT.AutoDiscoverConfigFile() ).Any( string.IsNullOrEmpty );
			if ( !anyFilesWithoutConfig ) return true;

			var r = MessageBox.Show( Properties.Resources.ConfigMissing_Text, Properties.Resources.ConfigMissing_Caption, MessageBoxButtons.YesNo, MessageBoxIcon.Question );
			if ( r == DialogResult.No ) return false;

			inputFiles
				.Select( f => f.Item.ContainingProject )
				.Distinct()
				.Select( proj => {
					var targetFolder = (from i in GetFiles( GetItems( proj.ProjectItems ) )
															let name = Path.GetFileName( i.Path )
															where !string.IsNullOrEmpty( name )
															join folder in FoldersForDefaultTemplate on name.ToLower() equals folder
															select new { path = i.Path, items = i.Item.ProjectItems }
															)
															.FirstOrDefault()
															??
															new { path = Path.GetDirectoryName( proj.FullName ), items = proj.ProjectItems };

					var templatesFolderPath = Path.Combine( targetFolder.path, DefaultTemplatesFolder );
					var templatesFolder = GetFiles( GetItems( targetFolder.items ) )
																.Where( f => string.Equals( f.Path, templatesFolderPath, StringComparison.InvariantCultureIgnoreCase ) )
																.Select( f => f.Item )
																.FirstOrDefault()
																??
																(Directory.Exists( templatesFolderPath )
																	? targetFolder.items.AddFromDirectory( templatesFolderPath )
																	: targetFolder.items.AddFolder( DefaultTemplatesFolder ) );

					var configPath = Path.Combine( targetFolder.path, TsT.TsT.DefaultConfigFileName );
					var templatePath = Path.Combine( templatesFolderPath, DefaultTemplateFileName );
					System.IO.File.WriteAllBytes( configPath, Properties.Resources.DefaultConfig_Itself );
					System.IO.File.WriteAllBytes( templatePath, Properties.Resources.DefaultConfig_TypeTemplate );

					var config = targetFolder.items.AddFromFile( configPath );
					var template = templatesFolder.ProjectItems.AddFromFile( templatePath );

					return config;
				} )
				.Catch( ( Exception ex ) => {
					MessageBox.Show( ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error );
					return Enumerable.Empty<ProjectItem>();
				} )
				.TakeLast( 1 )
				.ForEach( config => config.Open().Activate() );

			return true;
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
			var ctx = PrepareFlagOperation( item );
			if ( ctx.PropertyStorage == null ) return;

			ctx.PropertyStorage.SetItemAttribute( ctx.ItemID, TranslateFlagName, flag.ToString() );
		}

		public static bool GetTranslateFlag( ProjectItem item ) {
			var ctx = PrepareFlagOperation( item );
			if ( ctx.PropertyStorage == null ) return false;

			string result;
			ctx.PropertyStorage.GetItemAttribute( ctx.ItemID, TranslateFlagName, out result );
			return string.Equals( result, true.ToString(), StringComparison.InvariantCultureIgnoreCase );
		}

		static FlagContext PrepareFlagOperation( ProjectItem item ) {
			if ( item.FileCount == 0 ) return new FlagContext();

			var project = item.ContainingProject;
			if ( project == null ) return new FlagContext();

			string firstFile;
			try { firstFile = item.FileNames[0]; }
			catch ( ArgumentException ) { return new FlagContext(); }

			var solution = Package.GetGlobalService( typeof( SVsSolution ) ) as IVsSolution;
			if ( solution == null ) return new FlagContext();

			IVsHierarchy hierarchy;
			solution.GetProjectOfUniqueName( project.UniqueName, out hierarchy );
			var propertyStorage = hierarchy as IVsBuildPropertyStorage;
			if ( propertyStorage == null ) return new FlagContext();

			uint itemID;
			hierarchy.ParseCanonicalName( firstFile, out itemID );

			return new FlagContext { PropertyStorage = propertyStorage, ItemID = itemID };
		}

		struct FlagContext
		{
			public IVsBuildPropertyStorage PropertyStorage;
			public uint ItemID;
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
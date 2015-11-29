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

		public const string MSBuildTargetsFileName = "erecruit.TsT.targets";
		public const string MSBuildTargetsFileRelativePath = "erecruit\\TsT\\";
		public const string MSBuildExtensionsPathVariable = "$(MSBuildExtensionsPath32)";

		/// <summary>
		/// Runs TsT on the given input files and adds resulting files to projects (if not already there),
		/// "nested" under their source files.
		/// </summary>
		public static void Translate( IEnumerable<File> inputFiles ) {
			if ( !EnsureConfig( inputFiles ) ) return;
			EnsureMSBuildImport( inputFiles.Select( f => f.Item.ContainingProject ).Distinct() );

			var dte = (DTE2)Package.GetGlobalService( typeof( SDTE ) );
			var files = inputFiles.ToList();
			var filesJoined = string.Join( ", ", files.Select( f => f.Path ) );
			var items = files.ToLookup( x => x.Path, x => x.Item, StringComparer.InvariantCultureIgnoreCase );
			var solutionDir = Path.GetDirectoryName( dte.Solution.FullName );
			WriteToOutputWindow( $"Preparing to translate {filesJoined}" );

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
			.Select( f => $"Generated {string.Join( ", ", f.SourceFiles )} -> {f.OutputFile}" )
			.DefaultIfEmpty( $"TsT produced no files while translating {filesJoined}{Environment.NewLine}Check your TsT config." )
			.Catch( ( Exception ex ) => {
				dte.StatusBar.Text = ex.Message;
				WriteToOutputWindow( ex.ToString() );
				return Observable.Empty<string>();
			})
			.Subscribe( msg => {
				dte.StatusBar.Text = msg;
				WriteToOutputWindow( msg );
			} );

		}

		/// <summary>
		/// Writes a message to VS output window, creating it if it's not there yet.
		/// </summary>
		public static void WriteToOutputWindow( string msg ) {
			var output = Package.GetGlobalService( typeof( SVsOutputWindow ) ) as IVsOutputWindow;
			if ( output == null ) return;

			var paneID = GuidList.OutputPane;
			output.CreatePane( ref paneID, "erecruit.TsT", 1, 0 );

			IVsOutputWindowPane pane;
			if ( ErrorHandler.Failed( output.GetPane( ref paneID, out pane ) ) || pane == null ) return;

			pane.OutputString( $"{DateTime.Now:HH:mm:ss}: {msg}{Environment.NewLine}" );
		}

		static HashSet<string> _askedAboutImports = new HashSet<string>();

		/// <summary>
		/// Checks that all given projects have TsT.targets input in them.
		/// If not, adds the the imports automatically, asking the user for confirmation first.
		/// </summary>
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
				.Where( msbuildProj => !msbuildProj.Xml.Imports.Any( i => i.Project.IndexOf( MSBuildTargetsFileName, StringComparison.InvariantCultureIgnoreCase ) >= 0 ) )
				.ToList();

			if ( eligibleProjects.Any() ) {
				var r = MessageBox.Show( Properties.Resources.TargetsImportMissing_Text, Properties.Resources.TargetsImportMissing_Caption, MessageBoxButtons.YesNo, MessageBoxIcon.Question );
				if ( r == DialogResult.Yes ) {
					eligibleProjects.ForEach( p => p.Xml.AddImport( MSBuildExtensionsPathVariable + "\\" + MSBuildTargetsFileRelativePath + MSBuildTargetsFileName ) );
				}
			}
		}

		/// <summary>
		/// Checks if all projects that contain given input files have a TsT config in them.
		/// If not, adds the default config automatically, asking the user for confirmation first.
		/// </summary>
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

					WriteToOutputWindow( $"Adding TsT config file at {configPath}" );
					var config = targetFolder.items.AddFromFile( configPath );
					var template = templatesFolder.ProjectItems.AddFromFile( templatePath );

					return config;
				} )
				.Catch( ( Exception ex ) => {
					MessageBox.Show( ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error );
					WriteToOutputWindow( ex.ToString() );
					return Enumerable.Empty<ProjectItem>();
				} )
				.TakeLast( 1 )
				.ForEach( config => config.Open().Activate() );

			return true;
		}

		/// <summary>
		/// Includes the given file in the project, "nested" under the given project item
		/// (if the file is not already there), and sets the "TsTranslate" flag on the project
		/// item to true.
		/// </summary>
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

		/// <summary>
		/// Converts given list of <see cref="ProjectItem"/>s to list of our <see cref="File"/> structures. 
		/// </summary>
		/// <remarks>
		/// This is made a separate function, because such conversion is not trivial: each project item
		/// may contain multiple actual files, and file names are not exposed as IEnumerable, but have to
		/// be accessed by index.
		/// </remarks>
		public static IEnumerable<File> GetFiles( IEnumerable<ProjectItem> items ) {
			foreach ( var item in items ) {
				for ( short i = 1; i <= item.FileCount; i++ ) {
					yield return new File { Path = item.FileNames[i], Item = item };
				}
			}
		}

		/// <summary>
		/// Sets the "TsTranslate" flag to either true or false on the given <see cref="ProjectItem"/>.
		/// </summary>
		public static void SetTranslateFlag( ProjectItem item, bool flag ) {
			var ctx = PrepareFlagOperation( item );
			if ( ctx.PropertyStorage == null ) return;

			ctx.PropertyStorage.SetItemAttribute( ctx.ItemID, TranslateFlagName, flag.ToString() );
		}

		/// <summary>
		/// Retrieves the value of the "TsTranslate" flag on the given <see cref="ProjectItem"/>.
		/// </summary>
		public static bool GetTranslateFlag( ProjectItem item ) {
			var ctx = PrepareFlagOperation( item );
			if ( ctx.PropertyStorage == null ) return false;

			string result;
			ctx.PropertyStorage.GetItemAttribute( ctx.ItemID, TranslateFlagName, out result );
			return string.Equals( result, true.ToString(), StringComparison.InvariantCultureIgnoreCase );
		}

		/// <summary>
		/// Performs various magic unwraps and checks to prepare for setting/retrieving a
		/// <see cref="ProjectItem"/>'s property.
		/// </summary>
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

		/// <summary>
		/// Exposes <see cref="ProjectItem"/>s as enumerable given their container.
		/// </summary>
		/// <remarks>
		/// This has to be a separate function, because the only way the API provides
		/// to access them is by index, and that's very inconvenient to use with LINQ.
		/// </remarks>
		public static IEnumerable<ProjectItem> GetItems( ProjectItems items ) {
			for ( short j = 1; j <= items.Count; j++ ) yield return items.Item( j );
		}

		/// <summary>
		/// Gets a list of <see cref="ProjectItem"/>s currently selected in the IDE.
		/// </summary>
		public static IEnumerable<ProjectItem> GetSelectedItems() {
			var dte = (DTE2)Package.GetGlobalService( typeof( SDTE ) );
			for ( short j = 1; j <= dte.SelectedItems.Count; j++ ) yield return dte.SelectedItems.Item( j ).ProjectItem;
		}

		/// <summary>
		/// Gets the list of files (which is different from <see cref="ProjectItem"/>s - see <see cref="GetFiles"/>)
		/// currently selected in the IDE.
		/// </summary>
		/// <returns></returns>
		public static IEnumerable<Core.File> GetSelectedFiles() { return Core.GetFiles( GetSelectedItems() ); }

		public class File
		{
			public string Path { get; set; }
			public ProjectItem Item { get; set; }
		}
	}
}
using System;
using System.Collections.Generic;
using System.ComponentModel.Design;
using System.Linq;
using System.Runtime.InteropServices;
using EnvDTE;
using EnvDTE80;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;

namespace erecruit.vs
{
	[PackageRegistration( UseManagedResourcesOnly = true )]
	[InstalledProductRegistration( "#110", "#112", "1.0", IconResourceID = 400 )]
	[ProvideAutoLoad( UIContextGuids80.SolutionExists )]
	[ProvideMenuResource( "Menus.ctmenu", 1 )]
	[Guid( GuidList.guidvsPkgString )]
	public sealed class TsTPackage : Package
	{
		protected override void Initialize()
		{
			base.Initialize();

			_dte = GetService( typeof( DTE ) ) as DTE2;
			var menu = GetService( typeof( IMenuCommandService ) ) as IMenuCommandService;
			var cmd = new OleMenuCommand( ( s, e ) => AttachTranslator(), new CommandID( GuidList.guidvsCmdSet, (int)PkgCmdIDList.cmdidAddTranslated ) );
			cmd.BeforeQueryStatus += ( s, e ) => BeforeQueryStatus( s as OleMenuCommand );
			menu.AddCommand( cmd );
		}

		void AttachTranslator()
		{
			Core.Translate( Core.GetSelectedFiles().Where( x => x.Path.EndsWith( Core.TypeScriptExtension ) ) );
		}

		void BeforeQueryStatus( OleMenuCommand cmd )
		{
			cmd.Enabled = Core.GetSelectedFiles()
				.Select( f => f.Path.EndsWith( Core.TypeScriptExtension ) && !Core.GetTranslateFlag( f.Item ) )
				.DefaultIfEmpty( false ).First();
		}

		public static IEnumerable<int> IncludeInProjectIfNotThere( ProjectItem item, string file )
		{
			if ( item != null )
			{
				Core.SetTranslateFlag( item, true );
				var subItems = Core.GetFiles( Core.GetItems( item.ProjectItems ) ).ToList();
				if ( !subItems.Any( x => string.Equals( x.Path, file, StringComparison.InvariantCultureIgnoreCase ) ) )
				{
					item.ProjectItems.AddFromFile( file );
				}
			}
			yield return 0;
		}

		DTE2 _dte;
	}
}
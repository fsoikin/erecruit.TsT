using System;
using System.Collections.Generic;
using System.ComponentModel.Design;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using EnvDTE;
using EnvDTE80;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;

namespace erecruit.TsT.VS
{
	[PackageRegistration( UseManagedResourcesOnly = true )]
	[InstalledProductRegistration( "#110", "#112", "1.0", IconResourceID = 400 )]
	[Guid( "{A0BE74CB-76B7-42A0-9CC7-EB3D075CAD0B}" )]
	[ProvideMenuResource( "Menus.ctmenu", 1 )]
	[ProvideAutoLoad( UIContextGuids80.SolutionExists )]
	class EntryPoint : Package
	{
		DTE2 _dte;

		protected override void Initialize() {
			base.Initialize();

			_dte = GetService(typeof( DTE )) as DTE2;
			var menu = GetService( typeof( IMenuCommandService ) ) as IMenuCommandService;
			var cmd = new OleMenuCommand( async ( s, e ) => await AttachTranslator(), new CommandID( Commands.CmdSet, Commands.AttachTranslatorCommand ) );
			cmd.BeforeQueryStatus += (s,e) => BeforeQueryStatus( s as OleMenuCommand );
			menu.AddCommand( cmd );
		}

		async System.Threading.Tasks.Task AttachTranslator() {
		}

		void BeforeQueryStatus( OleMenuCommand cmd ) {
			if ( _dte.SelectedItems.Count == 0 ) { cmd.Enabled = false; return; }

			var item = _dte.SelectedItems.Item(0).ProjectItem;
			for ( short i = 0; i < item.FileCount; i++ ) {
				if ( item.FileNames[i].EndsWith( ".ts" ) ) {
					cmd.Enabled = true;
					return;
				}
			}

			cmd.Enabled = false;
		}
	}
}
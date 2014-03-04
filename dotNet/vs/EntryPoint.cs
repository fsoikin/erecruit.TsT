using System;
using System.Collections.Generic;
using System.ComponentModel.Design;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.VisualStudio.Shell;

namespace erecruit.TsT.VS
{
	class EntryPoint
	{
		void SetupMenuCommands() {
			CommandID JsId = new CommandID( GuidList.guidDiffCmdSet, (int)PkgCmdIDList.cmdJavaScriptIntellisense );
			OleMenuCommand jsCommand = new OleMenuCommand( async ( s, e ) => await Execute( ".js" ), JsId );
			jsCommand.BeforeQueryStatus += JavaScript_BeforeQueryStatus;
			_mcs.AddCommand( jsCommand );
		}
	}
}
using System.ComponentModel.Composition;
using EnvDTE80;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Editor;
using Microsoft.VisualStudio.Utilities;

namespace erecruit.vs
{
	[Export( typeof( IWpfTextViewCreationListener ) )]
	[ContentType( "text" )]
	[TextViewRole( PredefinedTextViewRoles.Document )]
	public class EditorListener : IWpfTextViewCreationListener
	{
		[Import]
		public ITextDocumentFactoryService TextDocumentFactoryService { get; set; }

		public void TextViewCreated( IWpfTextView textView ) {
			ITextDocument doc;
			if ( TextDocumentFactoryService.TryGetTextDocument( textView.TextDataModel.DocumentBuffer, out doc ) ) {
				doc.FileActionOccurred += ( s, e ) => {
					if ( e.FileActionType != FileActionTypes.ContentSavedToDisk ) return;

					var dte = (DTE2)Package.GetGlobalService( typeof( SDTE ) );
					var item = dte != null ? dte.Solution.FindProjectItem( e.FilePath ) : null;
					if ( item != null && Core.GetTranslateFlag( item ) ) {
						Core.Translate( Core.GetFiles( new[] { item } ) );
					}
				};
			}
		}
	}
}
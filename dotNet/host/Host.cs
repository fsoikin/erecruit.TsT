using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace erecruit.TsT
{
    public class Host : JS.ITsTHost
    {
			private readonly string _originPath;
			public Host( string originPath ) {
				this._originPath = originPath ?? ".";
			}

			public string FetchFile( string fileName ) {
				try {
					return fileName == Lib_d_ts ? Properties.Resources.lib_d_ts : File.ReadAllText( Path.Combine( _originPath, fileName ) );
				}
				catch ( Exception ex ) {
					throw new Microsoft.ClearScript.ScriptEngineException( ex.Message );
				}
			}

			public string ResolveRelativePath( string path, string directory ) {
				return MakeRelativePath( _originPath, Path.GetFullPath( Path.Combine( Path.Combine( _originPath, directory ), path ) ) );
			}

			public string MakeRelativePath( string from, string to ) {
				if ( string.IsNullOrEmpty( from ) ) return to;
				if ( string.IsNullOrEmpty( to ) ) return from;
				var fromUri = new Uri( Path.GetFullPath( Path.Combine( _originPath, from ) ) + "/x" );
				var toUri = new Uri( Path.GetFullPath( Path.Combine( _originPath, to ) ) );
				return fromUri.Scheme != toUri.Scheme ? to : Uri.UnescapeDataString( fromUri.MakeRelativeUri( toUri ).ToString() );
			}

			public bool DirectoryExists( string path ) {
				return Directory.Exists( path );
			}

			public string GetParentDirectory( string path ) {
				return Path.GetDirectoryName( path );
			}

			const string Lib_d_ts = "{4D5A953B-87FF-40A2-B90B-C843F91B7D3C}";
			public string[] GetIncludedTypingFiles() {
				return new[] { Lib_d_ts };
			}
		}
}

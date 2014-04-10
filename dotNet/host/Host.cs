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
				this._originPath = Path.GetFullPath( originPath ?? "." );
			}

			public string FetchFile( string fileName ) {
				if ( fileName != null && fileName.EndsWith( Lib_d_ts ) ) return Properties.Resources.lib_d_ts;

				var fullPath = Path.Combine( _originPath, fileName );
				if ( File.Exists( fullPath ) ) return File.ReadAllText( fullPath );
				return null;
			}

			public string ResolveRelativePath( string path, string directory ) {
				return PathUtil.MakeRelativePath( _originPath, Path.GetFullPath( Path.Combine( Path.Combine( _originPath, directory ), path ) ) );
			}

			public string MakeRelativePath( string from, string to ) {
				return PathUtil.MakeRelativePath( Path.Combine( _originPath, from ), Path.Combine( _originPath, to ) );
			}

			public bool DirectoryExists( string path ) {
				return Directory.Exists( Path.Combine( _originPath, path ) );
			}

			public string GetParentDirectory( string path ) {
				if ( string.IsNullOrEmpty( path ) ) return "";

				path = Path.GetFullPath( Path.Combine( _originPath, path ) );
				if ( !path.StartsWith( _originPath ) ) return "";

				return MakeRelativePath( _originPath, Path.GetDirectoryName( path ) );
			}

			const string Lib_d_ts = "{4D5A953B-87FF-40A2-B90B-C843F91B7D3C}";
			public string[] GetIncludedTypingFiles() {
				return new[] { Lib_d_ts };
			}
		}
}

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
			private readonly Action<string> _log;

			public Host( string originPath, Action<string> log = null ) {
				this._log = log;
				this._originPath = Path.GetFullPath( originPath ?? "." );
			}

			private void log( string msg ) { if ( _log != null ) _log( $"Host({_originPath}): {msg}" ); }

			public string FetchFile( string fileName ) {
				if ( fileName != null && fileName.EndsWith( Lib_d_ts ) ) {
					log( "Fetching lib.d.ts" );
					return Properties.Resources.lib_d_ts;
				}

				var fullPath = Path.Combine( _originPath, fileName );
				log( $"Fetching {fileName} from {fullPath}." );
				if ( File.Exists( fullPath ) ) return File.ReadAllText( fullPath );

				log( $"File {fullPath} doesn't exist. Returning null." );
				return null;
			}

			public string ResolveRelativePath( string path, string directory ) {
				log( "ResolveRelativePath " + directory + " -- " + path );
				return PathUtil.MakeRelativePath( _originPath, Path.GetFullPath( Path.Combine( Path.Combine( _originPath, directory ), path ) ) );
			}

			public string MakeRelativePath( string from, string to ) {
				log( "MakeRelativePath " + from + " -> " + to );
				return PathUtil.MakeRelativePath( Path.Combine( _originPath, from ), Path.Combine( _originPath, to ) );
			}

			public bool DirectoryExists( string path ) {
				log( "DirectoryExists " + path );
				return Directory.Exists( Path.Combine( _originPath, path ) );
			}

			public string GetParentDirectory( string path ) {
				log( "GetParentDirectory " + path );
				if ( string.IsNullOrEmpty( path ) ) return "";

				path = Path.GetFullPath( Path.Combine( _originPath, path ) );
				if ( !path.StartsWith( _originPath ) ) return "";

				return MakeRelativePath( _originPath, Path.GetDirectoryName( path ) );
			}

			const string Lib_d_ts = "4D5A953B87FF40A2B90BC843F91B7D3C.ts";
			public string[] GetIncludedTypingFiles() {
				return new[] { Lib_d_ts };
			}
		}
}
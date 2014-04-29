using System;
using System.Linq;
using System.Reactive.Linq;
using System.IO;
using System.Reactive.Subjects;
using System.Reactive.Threading.Tasks;
using Microsoft.ClearScript.V8;
using System.Reactive;
using System.Collections;
using Newtonsoft.Json;
using System.Collections.Generic;
using System.Diagnostics;
using o = erecruit.TsT.ScriptEngine.OutputKind;

namespace erecruit.TsT
{
	public class TsT : IDisposable
	{
		public const string DefaultConfigFileName = ".tstconfig";

		public event EventHandler<ScriptEngine.OutputEventArgs> Output;

		/// <summary>
		/// Discovers config(s) for the given files, calls <see cref="Emit"/> to parse them, and writes results to corresponding output files.
		/// </summary>
		/// <param name="files">List of files to parse. Paths must be either absolute or relative to the "current directory" as defined by the OS.</param>
		/// <param name="currentDir">The directory which is to be considered "root" for all paths within the parsing process.</param>
		/// <param name="discoverConfigFile">A delegate used to discover config file given file path. If not provided, defaults to <see cref="AutoDiscoverConfigFile"/>.</param>
		public IObservable<GeneratedFile> Emit( IEnumerable<string> files, string currentDir, Func<string, string> discoverConfigFile = null ) {
			var items = files.ToLookup( x => x, StringComparer.InvariantCultureIgnoreCase );
			var configs = files.ToLookup( discoverConfigFile ?? AutoDiscoverConfigFile( DefaultConfigFileName ) );

			var noConfigs = configs[""];
			if ( noConfigs.Any() ) {
				return Observable.Throw<GeneratedFile>( new Exception( "Cannot find .tstconfig for file(s): " + string.Join( ", ", noConfigs ) ) );
			}

			var originDir = Path.GetFullPath( currentDir );
			var host = new Host( originDir, s => log( s, ScriptEngine.OutputKind.Debug ) );
			return from filesPerConfig in configs.ToObservable()

						 let configPath = Path.GetFullPath( filesPerConfig.Key )
						 let configDir = Path.GetDirectoryName( configPath )
						 let _ = log( "TsT: Using config at " + configPath + " for files: " + string.Join( ", ", filesPerConfig ) )

						 from configContents in ReadContents( configPath )

						 from result in Emit( configDir, configContents, filesPerConfig, host )
						 from written in WriteContents( Path.Combine( originDir, result.OutputFile ), result.Content )

						 select new GeneratedFile {
							 SourceFiles = result.SourceFiles,
							 OutputFile = result.OutputFile
						 };
		}

		/// <summary>
		/// Creates a function that discovers config file given file path by traversing directories up the file system tree
		/// until a file with given name is found.
		/// </summary>
		public static Func<string, string> AutoDiscoverConfigFile( string configFileName = DefaultConfigFileName ) {
			return path => GetDirsUp( Path.GetDirectoryName( path ) )
				.Select( d => Path.Combine( d, configFileName ) )
				.FirstOrDefault( System.IO.File.Exists )
				?? "";
		}

		/// <summary>
		/// Parses config and calls the JS core
		/// </summary>
		/// <param name="configDir">Folder from where the config file came. Must be either absolute or relative to the "origin" of the given host.</param>
		/// <param name="configJson">The config itself, serialized as JSON.</param>
		/// <param name="files">List of file paths to parse. Must be either absolute or relative to the "origin" of the given host.</param>
		/// <param name="host">Bridge between the JS core and the host file system.</param>
		public IObservable<JS.FileContent> Emit( string configDir, string configJson, IEnumerable<string> files, JS.ITsTHost host ) {
			return from _ in EnsureInitialized()
						 from jsonSerialize in _engine.Evaluate( "JSON.stringify" )

						 from config in _engine.Evaluate( "(" + configJson + ")" )
						 let rootDir = (string)( config.RootDir = host.ResolveRelativePath( (config.RootDir as string) ?? "", configDir ) )
						 let _2 = config.ConfigDir = host.MakeRelativePath( config.RootDir, configDir )
						 let _3 = log( "TsT: Read config from " + configDir + ", ConfigDir=" + config.ConfigDir + ", RootDir=" + config.RootDir )
						 let filesRelativeToRoot = files.Select( f => host.MakeRelativePath( rootDir, f ) )

						 let result = new System.Reactive.Subjects.Subject<dynamic>()
						 from __ in _engine.QueueAction( () =>
							 _emit( config, filesRelativeToRoot.ToArray(), host )
							 .subscribe( new {
								 onNext = new Action<dynamic>( x => result.OnNext( x ) ),
								 onError = new Action<object>( err => { result.OnError( new DynamicException( err ) ); result.OnCompleted(); } ),
								 onCompleted = new Action( () => result.OnCompleted() )
							 } ) )

						 from r in result
								.Timeout( ScriptEngine.JavaScriptCallTimeout )
								.Catch( ( DynamicException ex ) => _engine
									.Queue( () => _formatError( ex.Object ) )
									.SelectMany( str => Observable.Throw<dynamic>( new Exception( str ) ) ) )

						 from asJson in _engine.Queue( () => jsonSerialize( r ) )
						 select (JS.FileContent)JsonConvert.DeserializeObject<JS.FileContent>( asJson );
		}

		static IEnumerable<string> GetDirsUp( string mostNestedDirPath ) {
			var path = mostNestedDirPath;
			while ( !string.IsNullOrWhiteSpace( path ) ) {
				yield return path;
				path = Path.GetDirectoryName( path );
			}
		}

		static IObservable<string> ReadContents( string path ) {
			return Observable.Using(
				() => System.IO.File.OpenText( path ),
				str => Observable.FromAsync( str.ReadToEndAsync ) );
		}

		static IObservable<Unit> WriteContents( string path, string contents ) {
			return Observable.Using(
				() => System.IO.File.CreateText( path ),
				str => Observable.FromAsync( async () => await str.WriteAsync( contents ) ) );
		}

		IObservable<Unit> AmendConfig( string configDir, JS.Config c ) {
			c.RootDir = Path.Combine( configDir, (c.RootDir as string) ?? "" );
			c.ConfigDir = PathUtil.MakeRelativePath( c.RootDir, configDir );
			return Observable.Return( Unit.Default );
		}

		IObservable<Unit> EnsureInitialized() {
			if ( _emit != null ) return Observable.Empty<Unit>();
			Dispose();

			log( "TsT: Initializing the script engine", o.Debug );
			_engine = new ScriptEngine();
			_engine.Output += ( s, e ) => log( "JS: " + e.Message, e.Kind );

			log( "TsT: Initializing the TsT JS core", o.Debug );
			return _engine
				.Execute( "tst.js", Properties.Resources.tst_js.Replace( "\xEF\xBB\xBF", "" ) )

				.Do( _ => log( "TsT: Initializing the TsT JS core: obtaining Emit", o.Debug ) )
				.SelectMany( _ => _engine.Evaluate( "erecruit.TsT.Emit" ) )
				.Do( e => _emit = e )

				.Do( _ => log( "TsT: Initializing the TsT JS core: obtaining formatError", o.Debug ) )
				.SelectMany( _ => _engine.Evaluate( "(function(x) { return x + ' ' + JSON.stringify(x); })" ) )
				.Do( f => _formatError = f )

				.Do( _ => log( "TsT: JS core initialization complete", o.Debug ) )
				.Select( _ => Unit.Default );
		}

		public void Dispose() {
			var e = _engine;
			_engine = null; _emit = null; _formatError = null;
			if ( e != null ) e.Dispose();
		}

		private Unit log( string msg, ScriptEngine.OutputKind kind = o.Log ) {
			var o = Output; 
			if ( o != null ) o( this, new ScriptEngine.OutputEventArgs( kind, msg ) );
			return Unit.Default;
		}

		ScriptEngine _engine = new ScriptEngine();
		dynamic _emit;
		dynamic _formatError;
	}

	public class DynamicException : Exception
	{
		public dynamic Object { get; private set; }

		public DynamicException( dynamic obj ) : base( Convert.ToString( (object)obj ) ) {
			Object = obj;
		}
	}
}
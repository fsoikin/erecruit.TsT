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

namespace erecruit.TsT
{
	public class TsT : IDisposable
	{
		public const string DefaultConfigFileName = ".tstconfig";

		public IObservable<GeneratedFile> Emit( IEnumerable<string> files, string currentDir, Func<string, string> discoverConfigFile ) {
			var items = files.ToLookup( x => x, StringComparer.InvariantCultureIgnoreCase );
			var configs = files.ToLookup( discoverConfigFile );

			var noConfigs = configs[""];
			if ( noConfigs.Any() ) {
				return Observable.Throw<GeneratedFile>( new Exception( "Cannot find .tstconfig for path " + noConfigs.First() ) );
			}

			var host = new Host( System.IO.Path.GetDirectoryName( currentDir ) );
			return from filesPerConfig in configs.ToObservable()
						 from configContents in ReadContents( filesPerConfig.Key )
						 let configDir = Path.GetDirectoryName( filesPerConfig.Key )

						 from result in Emit( configDir, configContents, filesPerConfig.ToArray(), host )
						 from written in WriteContents( result.OutputFile, result.Content )

						 select new GeneratedFile { SourceFiles = result.SourceFiles, OutputFile = result.OutputFile };
		}

		public static Func<string, string> AutoDiscoverConfigFile( string configFileName = DefaultConfigFileName ) {
			return path => GetDirsUp( Path.GetDirectoryName( path ) )
				.Select( d => Path.Combine( d, configFileName ) )
				.FirstOrDefault( System.IO.File.Exists )
				?? "";
		}

		public IObservable<JS.FileContent> Emit( string configDir, string configJson, string[] files, JS.ITsTHost host ) {
			return from _ in EnsureInitialized()
						 from jsonSerialize in _engine.Evaluate( "JSON.stringify" )

						 from config in _engine.Evaluate( "(" + configJson + ")" )
						 from amended in AmendConfig( configDir, (object)config )

						 let result = new System.Reactive.Subjects.Subject<dynamic>()
						 from __ in _engine.QueueAction( () =>
							 _emit( config, files, host )
							 .subscribe( new {
								 onNext = new Action<dynamic>( result.OnNext ),
								 onError = new Action<object>( err => { result.OnError( new DynamicException( err ) ); result.OnCompleted(); } ),
								 onCompleted = new Action( () => result.OnCompleted() )
							 } ) )

						 from r in result
								.Catch( ( DynamicException ex ) => _engine
									.Queue( () => _formatError( ex.Object ) )
									.SelectMany( str => Observable.Throw<dynamic>( new Exception( str ) ) ) )

						 from asJson in _engine.Queue( () => jsonSerialize( r ) )
						 let asPoco = (JS.FileContent)JsonConvert.DeserializeObject<JS.FileContent>( asJson )
						 let rootDir = (string)config.RootDir
						 select new JS.FileContent {
							 Content = asPoco.Content,
							 OutputFile = Path.GetFullPath( Path.Combine( rootDir, asPoco.OutputFile ) ),
							 SourceFiles = asPoco.SourceFiles.Select( f => Path.GetFullPath( Path.Combine( rootDir, f ) ) ).ToArray()
						 };
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

		IObservable<Unit> AmendConfig( string configDir, object cc ) {
			dynamic config = cc;
			config.ConfigDir = configDir;
			config.RootDir = Path.Combine( configDir, (config.RootDir as string) ?? "" );
			return Observable.Return( Unit.Default );
		}

		IObservable<Unit> EnsureInitialized() {
			if ( _emit != null ) return Observable.Empty<Unit>();
			Dispose();
			_engine = new ScriptEngine();

			return _engine
				.Execute( "tst.js", Properties.Resources.tst_js.Replace( "\xEF\xBB\xBF", "" ) )
				
				.SelectMany( _ => _engine.Evaluate( "erecruit.TsT.Emit" ) )
				.Do( e => _emit = e )
				
				.SelectMany( _ => _engine.Evaluate( "(function(x) { return x + ' ' + JSON.stringify(x); })" ) )
				.Do( f => _formatError = f )

				.Select( _ => Unit.Default );
		}

		public void Dispose() {
			var e = _engine;
			_engine = null; _emit = null; _formatError = null;
			if ( e != null ) e.Dispose();
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
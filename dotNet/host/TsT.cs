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

namespace erecruit.TsT
{
	public class TsT : IDisposable
	{
		public static IObservable<GeneratedFile> Generate( IEnumerable<string> files, string currentDir, string configFileName ) {
			var items = files.ToLookup( x => x, StringComparer.InvariantCultureIgnoreCase );
			var configs = files.ToLookup( x => FindConfigFor( x, configFileName ) );

			var noConfigs = configs[""];
			if ( noConfigs.Any() ) {
				return Observable.Throw<GeneratedFile>( new Exception( "Cannot find .tstconfig for path " + noConfigs.First() ) );
			}

			var host = new Host( System.IO.Path.GetDirectoryName( currentDir ) );
			return Observable
				.Using( () => new TsT(), tst => 
					from filesPerConfig in configs.ToObservable()
					from configContents in ReadContents( filesPerConfig.Key )
					let configDir = Path.GetDirectoryName( filesPerConfig.Key )

					from result in tst.Emit( configDir, configContents, filesPerConfig.ToArray(), host )

					let outFile = Path.GetFullPath( Path.Combine( configDir, result.OutputFile ) )
					from written in WriteContents( outFile, result.Content )

					select new GeneratedFile { SourceFiles = result.SourceFiles, OutputFile = outFile }
			);
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
								 onError = new Action<object>( err => result.OnError( new Exception( Convert.ToString( err ) ) ) ),
								 onCompleted = new Action( result.OnCompleted )
							 } ) )

						 from r in result
						 from asJson in _engine.Queue( () => jsonSerialize(r) )
						 let asPoco = JsonConvert.DeserializeObject<JS.FileContent>( asJson )
						 select (JS.FileContent)asPoco;
		}

		static string FindConfigFor( string path, string configFileName ) {
			return GetDirsUp( Path.GetDirectoryName( path ) )
				.Select( d => Path.Combine( d, configFileName ) )
				.FirstOrDefault( System.IO.File.Exists )
				?? "";
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
				.Select( _ => Unit.Default );
		}

		public void Dispose() {
			var e = _engine;
			_engine = null; _emit = null;
			if ( e != null ) e.Dispose();
		}

		ScriptEngine _engine = new ScriptEngine();
		dynamic _emit;
	}
}
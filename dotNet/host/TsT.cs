using System;
using System.Reactive.Linq;
using System.IO;
using System.Reactive.Subjects;
using System.Reactive.Threading.Tasks;
using Microsoft.ClearScript.V8;
using System.Reactive;
using System.Collections;
using Newtonsoft.Json;

namespace erecruit.TsT
{
	public class TsT : IDisposable
	{
		public IObservable<JS.FileContent> Emit( string configJson, string[] files, JS.ITsTHost host ) {
			return from _ in EnsureInitialized()
						 from jsonSerialize in _engine.Evaluate( "JSON.stringify" )
						 from config in _engine.Evaluate( "(" + configJson + ")" )
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
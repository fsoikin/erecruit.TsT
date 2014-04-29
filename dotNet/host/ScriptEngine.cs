using System;
using System.Collections;
using System.Diagnostics;
using System.Reactive;
using System.Reactive.Linq;
using System.Reactive.Subjects;
using Microsoft.ClearScript.V8;

namespace erecruit.TsT
{
	public class ScriptEngine
	{
		public static TimeSpan JavaScriptCallTimeout = TimeSpan.FromMinutes( 5 );

		public enum OutputKind {
			Log, Error, Warning, Debug
		}

		public class OutputEventArgs : EventArgs
		{
			public OutputKind Kind { get; private set; }
			public string Message { get; private set; }
			public OutputEventArgs( OutputKind kind, string msg ) {
				this.Kind = kind; this.Message = msg;
			}
		}

		public event EventHandler<OutputEventArgs> Output;

		public ScriptEngine() {
			_runtime = new Microsoft.ClearScript.V8.V8Runtime();
			_engine = _runtime.CreateScriptEngine();
			_engine.AddHostObject( "setTimeout", new Func<dynamic, int, int>( setTimeout ) );
			_engine.AddHostObject( "clearTimeout", new Action<int>( clearTimeout ) );

			Func<OutputKind, Action<object>> debugWrite = k => o => log( Convert.ToString( o ), k );
			_engine.AddHostObject( "console", new { 
				log = debugWrite( OutputKind.Log ), 
				error = debugWrite( OutputKind.Error ), 
				warn = debugWrite( OutputKind.Warning ),
				debug = debugWrite( OutputKind.Debug ) // TODO: make this configurable - i.e. make this member null if the consumer didn't request debug info
			} );

			IConnectableObservable<Action> runQueue = null;
			runQueue = _queue
				 .ObserveOn( System.Reactive.Concurrency.ThreadPoolScheduler.Instance )
				 .Do( a => {
//					 log( "ScriptEngine: Executing queued action: " + a.GetHashCode().ToString( "X" ), OutputKind.Debug );
					 a();
//					 log( "ScriptEngine: Done executing queued action: " + a.GetHashCode().ToString( "X" ), OutputKind.Debug );
				 } )
				 .Publish();
			_runningQueue = runQueue.Connect();
			_doneActions = runQueue;
		}

		public IObservable<T> Queue<T>( Func<T> f ) {
			T value = default( T );
			return QueueAction( () => value = f() ).Select( _ => value );
		}

		public IObservable<Unit> QueueAction( Action a ) {
			var hash = a.GetHashCode().ToString( "X" );
//			log( "ScriptEngine: QueueAction: " + hash, OutputKind.Debug );
			var result = _doneActions.Where( x => x == a )
//				.Do( _ => log( "ScriptEngine: Received done action signal: " + hash, OutputKind.Debug ) )
				.Take( 1 ).Select( _ => Unit.Default )
//				.Do( _ => log( "ScriptEngine: Done action signal, after Take(1): " + hash, OutputKind.Debug ) )
				.Replay( 1 ).RefCount()
//				.Do( _ => log( "ScriptEngine: Done, after RefCount: " + hash, OutputKind.Debug ) )
				;
			_queue.OnNext( a );
			return result.Timeout( JavaScriptCallTimeout );
		}

		public IObservable<dynamic> Evaluate( string code ) {
			dynamic result = null;
			return QueueAction( () => result = _engine.Evaluate( code ) ).Select( _ => result );
		}

		public IObservable<Unit> Execute( string documentName, string code ) {
			return QueueAction( () => _engine.Execute( documentName, code ) );
		}

		public void Dispose() {
			var r = _runtime;
			var e = _engine;
			var q = _runningQueue;
			_runtime = null; _engine = null;
			if ( q != null ) q.Dispose();
			if ( e != null ) e.Dispose();
			if ( r != null ) r.Dispose();
		}

		Subject<Action> _queue = new Subject<Action>();
		IObservable<Action> _doneActions;
		IDisposable _runningQueue;
		V8Runtime _runtime = new Microsoft.ClearScript.V8.V8Runtime();
		V8ScriptEngine _engine;

		int _timeoutStamp = 0;
		Hashtable _timeouts = new Hashtable();

		int setTimeout( dynamic func, int ms ) {
			var id = _timeoutStamp++;
			_timeouts[id] = func;
			log( "setTimeout: " + id, OutputKind.Debug );
			QueueAction( () => {
				if ( _timeouts[id] == func ) {
					log( "Invoking timeout: " + id, OutputKind.Debug );
					func();
					log( "Done invoking timeout: " + id, OutputKind.Debug );
				}
				_timeouts.Remove( id ); 
			} );
			return id;
		}

		void clearTimeout( int id ) {
			log( "clearTimeout: " + id, OutputKind.Debug ); 
			_timeouts.Remove( id );
		}

		void log( string msg, OutputKind kind ) {
			var e = Output;
			if ( e != null ) e( this, new OutputEventArgs( kind, Convert.ToString( msg ) ) );
			Debug.WriteLine( msg );
		}
	}
}

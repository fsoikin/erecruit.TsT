using System;
using System.Collections;
using System.Diagnostics;
using System.Reactive;
using System.Reactive.Disposables;
using System.Reactive.Linq;
using System.Reactive.Subjects;
using System.Threading;
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

		public ScriptEngine( bool debugOutput = false ) {
			_debugOutput = debugOutput;
			_runtime = new Microsoft.ClearScript.V8.V8Runtime();
			_engine = _runtime.CreateScriptEngine();
			_engine.AddHostObject( "setTimeout", new Func<dynamic, int, int>( setTimeout ) );
			_engine.AddHostObject( "clearTimeout", new Action<int>( clearTimeout ) );

			Func<OutputKind, Action<object>> debugWrite = k => o => log( Convert.ToString( o ), k );
			_engine.AddHostObject( "console", new { 
				log = debugWrite( OutputKind.Log ), 
				error = debugWrite( OutputKind.Error ), 
				warn = debugWrite( OutputKind.Warning ),
				debug = _debugOutput ? debugWrite( OutputKind.Debug ) : null
			} );

			var queueTransition = new Subject<bool>();
			var runQueue = _queue
				.Do( _ => queueTransition.OnNext( true ) )
				.ObserveOn( System.Reactive.Concurrency.ThreadPoolScheduler.Instance )
				.Do( a => a() )
				.Do( _ => queueTransition.OnNext( false ), queueTransition.OnError, queueTransition.OnCompleted )
				.Publish();
			var queueSize = queueTransition
				.Scan( 0, ( size, queued ) => size + (queued ? 1 : -1) )
				.Do( s => log( "ScriptEngine: Queue size = " + s, OutputKind.Debug ) )
				.Replay( 1 );

			_runningQueue = new CompositeDisposable( runQueue.Connect(), queueSize.Connect() );
			_queueSize = queueSize;
			_doneActions = runQueue;
		}

		public IObservable<Unit> WaitForDeferredExecutions() { return _queueSize.Where( s => s == 0 ).Select( _ => Unit.Default ).Take( 1 ); }

		public IObservable<T> Queue<T>( Func<T> f ) {
			T value = default( T );
			return QueueAction( () => value = f() ).Select( _ => value );
		}

		public IObservable<Unit> QueueAction( Action a ) {
			var result = _doneActions
				.Where( x => x == a )
				.Take( 1 ).Select( _ => Unit.Default )
				.Replay( 1 ).RefCount();
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
		IObservable<int> _queueSize;
		IObservable<Action> _doneActions;
		IDisposable _runningQueue;
		V8Runtime _runtime = new Microsoft.ClearScript.V8.V8Runtime();
		V8ScriptEngine _engine;
		readonly bool _debugOutput;

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
			if ( kind == OutputKind.Debug && !_debugOutput ) return;
			var e = Output;
			if ( e != null ) e( this, new OutputEventArgs( kind, Convert.ToString( msg ) ) );
			Debug.WriteLine( msg );
		}
	}
}

using System;
using System.Collections;
using System.Diagnostics;
using System.Reactive;
using System.Reactive.Linq;
using System.Reactive.Subjects;
using Microsoft.ClearScript.V8;

namespace erecruit.TsT
{
	class ScriptEngine
	{
		public ScriptEngine() {
			_runtime = new Microsoft.ClearScript.V8.V8Runtime();
			_engine = _runtime.CreateScriptEngine();
			_engine.AddHostObject( "setTimeout", new Func<dynamic, int, int>( setTimeout ) );
			_engine.AddHostObject( "clearTimeout", new Action<int>( clearTimeout ) );
			_engine.AddHostObject( "console", new { log = new Action<object>( o => Debug.WriteLine( o ) ) } );

			IConnectableObservable<Action> runQueue = null;
			runQueue = _queue
				 .ObserveOn( System.Reactive.Concurrency.ThreadPoolScheduler.Instance )
				 .Do( a => a() )
				 .Publish();
			_runningQueue = runQueue.Connect();
			_doneActions = runQueue;
		}

		public IObservable<T> Queue<T>( Func<T> f ) {
			T value = default( T );
			return QueueAction( () => value = f() ).Select( _ => value );
		}

		public IObservable<Unit> QueueAction( Action a ) {
			var result = _doneActions.Where( x => x == a ).Take( 1 ).Select( _ => Unit.Default ).Replay( 1 ).RefCount();
			_queue.OnNext( a );
			return result;
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
			QueueAction( () => { if ( _timeouts[id] == func ) func(); _timeouts.Remove( id ); } );
			return id;
		}

		void clearTimeout( int id ) {
			_timeouts.Remove( id );
		}
	}
}

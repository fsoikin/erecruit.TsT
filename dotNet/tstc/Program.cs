using System;
using System.Reactive.Linq;
using System.Linq;
using System.Collections.Generic;
using System.IO;
using NDesk.Options;
using System.Reactive.Concurrency;

namespace erecruit.TsT
{
	class Program
	{
		static int Main( string[] args ) {
			string configFile = null;
			string root = null;
			bool verbose = false, debug = false;
			var opts = new OptionSet() { 
				{ "c|config=", "Path to the config file (discovered automatically if not specified).", v => configFile = v },
				{ "r|root=", "Path to the directory, which is to be considered the common root of all input files (discovered automatically if not specified).", v => root = v },
				{ "v|verbose", "Display diagnostic output.", _ => verbose = true },
				{ "d|debug", "Display debug output.", _ => debug = true },
				{ "t|timeout=", "Specify timeout for JS calls, in seconds (default is 5 minutes; 0 means no timeout).", st => {
					uint t;
					if ( false == uint.TryParse( st, out t ) ) return;
					ScriptEngine.JavaScriptCallTimeout = t <= 0 ? TimeSpan.FromDays( 1 ) : TimeSpan.FromSeconds( t );
				}},
			};
			var inputFiles = opts.Parse( args );

			if ( inputFiles.Count == 1 && inputFiles[0][0] == '@' ) {
				try {
					inputFiles = File.ReadLines( inputFiles[0].Substring( 1 ) ).ToList();
				}
				catch ( Exception ex ) {
					Console.Error.WriteLine( ex );
					return 1;
				}
			}
			if ( !inputFiles.Any() ) {
				ShowUsage( opts );
				return 1;
			}

			var commonRoot = string.IsNullOrWhiteSpace( root ) ? CalculateCommonRoot( inputFiles.Select( Path.GetDirectoryName ) ) : root;
			if ( string.IsNullOrEmpty( commonRoot ) ) {
				Console.Error.WriteLine( "Unable to calculate common root directory for all given files." );
				return 1;
			}
			else if ( verbose ) {
				Console.WriteLine( "Using common root: " + commonRoot );
			}

			try {
				var result = Observable.Using( 
					() => { var tst = new TsT(); tst.Output += Output( verbose, debug ); return tst; },  // WTF, no inline event initializers in C# ?!?!
					tst =>
						from f in tst.Emit( inputFiles.Select( Path.GetFullPath ), commonRoot, configFile == null ? TsT.AutoDiscoverConfigFile() : (_ => configFile) )
						from s in f.SourceFiles
						select new { s, f.OutputFile }
						)
						.Do( x => Console.WriteLine( "{0} -> {1}", x.s, x.OutputFile ) )
						.SubscribeOn( ThreadPoolScheduler.Instance )
						.DefaultIfEmpty()
						.Wait();
			}
			catch ( Exception ex ) {
				Console.Error.WriteLine( ex.Message );
				return 1;
			}

			return 0;
		}

		private static EventHandler<ScriptEngine.OutputEventArgs> Output( bool verbose, bool debug ) {
			return ( s, e ) => {
				if ( e.Kind == ScriptEngine.OutputKind.Error || e.Kind == ScriptEngine.OutputKind.Warning ) withColor( ConsoleColor.Yellow, () => Console.Error.WriteLine( e.Message ) );
				else if ( e.Kind == ScriptEngine.OutputKind.Log && verbose ) Console.WriteLine( e.Message );
				else if ( e.Kind == ScriptEngine.OutputKind.Debug && debug ) withColor( ConsoleColor.Gray, () => Console.WriteLine( "DEBUG: " + e.Message ) );
			};
		}

		private static void withColor( ConsoleColor c, Action whatever ) {
			var save = Console.ForegroundColor;
			Console.ForegroundColor = c;
			whatever();
			Console.ForegroundColor = save;
		}

		private static string CalculateCommonRoot( IEnumerable<string> inputFiles ) {
			inputFiles = inputFiles.Select( f => f.Replace( '/', '\\') ).ToList();
			var firstFile = inputFiles.First();
			var parts = firstFile.Split( '\\' );
			var prefixes = Enumerable.Range( 0, parts.Length ).Select( idx => string.Join( "\\", parts.Take( parts.Length - idx ) ) ).ToList();
			return prefixes.FirstOrDefault( pref => inputFiles.All( f => f.StartsWith( pref ) ) );
		}

		static void ShowUsage( OptionSet opts ) {
			Console.WriteLine( @"
erecruit TsTranslator
Version {0}

Usage:    tstc <options> <source-files> 
See:      https://github.com/erecruit/TsT

Options: ", typeof( Program ).Assembly.GetName().Version );
			opts.WriteOptionDescriptions( Console.Out );
		}
	}
}
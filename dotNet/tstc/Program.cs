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
		static void Main( string[] args ) {
			string configFile = null;
			var inputFiles = new OptionSet() { 
					{ "c|config=", "Full path to the config file (discovered automatically if not specified).", v => configFile = v }
				}
				.Parse( args );

			if ( inputFiles.Count == 1 && inputFiles[0][0] == '@' ) {
				try {
					inputFiles = File.ReadLines( inputFiles[0].Substring( 1 ) ).ToList();
				}
				catch ( Exception ex ) {
					Console.Error.WriteLine( ex );
					return;
				}
			}
			if ( !inputFiles.Any() ) {
				Console.Error.WriteLine( "No input files specified" );
			}

			var commonRoot = CalculateCommonRoot( inputFiles );
			var result = Observable.Using( () => new TsT(), tst =>
				from f in tst.Emit( inputFiles, commonRoot, configFile == null ? TsT.AutoDiscoverConfigFile() : (_ => configFile) )
				from s in f.SourceFiles
				select new { s, f.OutputFile }
				)
				.Do( x => Console.WriteLine( "{0} -> {1}", x.s, x.OutputFile ) )
				.SubscribeOn( ThreadPoolScheduler.Instance )
				.Wait();
		}

		private static string CalculateCommonRoot( IEnumerable<string> inputFiles ) {
			inputFiles = inputFiles.Select( f => f.Replace( '/', '\\') ).ToList();
			var firstFile = inputFiles.First();
			var parts = firstFile.Split( '\\' );
			var prefixes = Enumerable.Range( 0, parts.Length ).Select( idx => string.Join( "\\", parts.Take( parts.Length - idx ) ) ).ToList();
			return prefixes.FirstOrDefault( pref => inputFiles.All( f => f.StartsWith( pref ) ) );
		}
	}
}
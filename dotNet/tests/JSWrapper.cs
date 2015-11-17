using System;
using System.Reactive.Linq;
using System.Reactive;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using FluentAssertions;
using Xunit;

namespace erecruit.TsT.Tests
{
	public class TsT
	{
		[Fact]
		public async Task Should_load_and_run_JS_code() {
			var config = @"{ 
				RootDir: '.',
				Types: { 
					'.': { 
						FileName: '{{Name}}.cs', 
						Template: '{{Interface().Name}}' 
					}
				} 
			}";

			var result = await new erecruit.TsT.TsT().Emit( ".", config, new[] { _fileName }, new MockHost() ).ToList();
			result.Select( x => x.OutputFile ).Should().BeEquivalentTo( "file.cs" );
			result.SelectMany( x => x.SourceFiles ).Should().BeEquivalentTo( _fileName );
			result.Select( x => x.Content ).Should().BeEquivalentTo( "I\r\nJ" );
		}

		[Fact]
		public async Task Should_propagate_JS_errors() {
			try {
				await new erecruit.TsT.TsT().Emit( ".", "{}", new[] { _erroneousFileName }, new MockHost() ).ToList();
				Assert.True( false, "Didn't throw" );
			}
			catch ( Exception ) {
			}
		}

		const string _fileName = "file.ts";
		const string _erroneousFileName = "whack.ts";

		public class MockHost : JS.ITsTHost
		{
			readonly erecruit.TsT.Host _inner = new erecruit.TsT.Host( "." );

			public string FetchFile( string fileName ) {
				if ( fileName == _fileName ) return "export interface I {} export interface J {}";
				if ( fileName == _erroneousFileName ) throw new Exception( "Whack!" );
				return null;
			}

			public string ResolveRelativePath( string path, string directory ) { return _inner.ResolveRelativePath( path, directory ); }
			public string MakeRelativePath( string from, string to ) { return _inner.MakeRelativePath( from, to ); }
			public bool DirectoryExists( string path ) { return false; }
			public string GetParentDirectory( string path ) { return _inner.GetParentDirectory( path ); }
			public string[] GetIncludedTypingFiles() { return new string[0]; }
		}
	}
}
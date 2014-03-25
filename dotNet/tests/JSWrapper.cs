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
	public class JSWrapper
	{
		[Fact]
		public async Task Should_load_and_run_JS_code() {
			var config = @"{ Types: { 
					RootDir: '.',
					'.': { 
						FileName: '{Name}.cs', 
						Template: '{Interface.Name}' 
					} 
				} }";

			var result = await new TsT().Emit( ".", config, new[] { _fileName }, new MockHost() ).ToList();
			result.Select( x => x.OutputFile ).Should().BeEquivalentTo( "file.cs" );
			result.SelectMany( x => x.SourceFiles ).Should().BeEquivalentTo( _fileName );
			result.Select( x => x.Content ).Should().BeEquivalentTo( "I\r\nJ" );
		}

		const string _fileName = "file.ts";

		public class MockHost : JS.ITsTHost
		{
			readonly Host _inner = new Host( "." );

			public string FetchFile( string fileName ) {
				if ( fileName == _fileName ) return "export interface I {} export interface J {}";
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
/// <reference path="../../lib/node/node.d.ts" />

module erecruit.TsT.Tests.Integration {

	def( {
		name: "test input set",
		aFileInSourceDir: "tests/integration/src/common.ts",
		expectedResults: ["common.cs", "ExportedClass.cs"],
		tstcArgs: "-c .tstconfig common.ts ExportedClass.ts"
	});

	def( {
		name: "C# example",
		aFileInSourceDir: "examples/csharp/.tstconfig",
		expectedResults: ["out/module.cs"],
		tstcArgs: "-c .tstconfig ../module.ts"
	});

	def( {
		name: "C# example with VS plugin's default config and template",
		aFileInSourceDir: "examples/csharp/.tstconfig",
		expectedResults: ["out/module.cs"],
		tstcArgs: "-c ../../dotNet/vs/Resources/.tstconfig ../module.ts"
	});

	def( {
		name: "its own code",
		aFileInSourceDir: "examples/self/.tstconfig",
		expectedResults: ["config", "emitter", "interfaces"].map( x => "../../dotNet/host/JS/" + x + ".cs" ),
		tstcArgs: "-c .tstconfig ../../src/config.ts ../../src/emitter.ts ../../src/interfaces.ts"
	});

	function def( args: { name: string; aFileInSourceDir: string; expectedResults: string[]; tstcArgs: string }) {
		
		// I'll be part of "/built/tests/testSpec.js" at runtime, so "." maps to "/built/tests"
		var srcPath = path.dirname( require.resolve( "../../" + args.aFileInSourceDir ) );

		describe( "tstc", () => {
			it( "should successfully compile " + args.name, ( done: Function ) => {

				args.expectedResults.filter( fs.existsSync ).map( fs.unlinkSync );

				require( 'child_process' ).exec(
					['node', require.resolve( "../tstc.js" ), args.tstcArgs].join( ' ' ),
					{ cwd: srcPath, stdio: ['ignore', 'ignore', 'pipe'] },
					( err: any, stdout: string, stderr: string ) => {
						expect( stderr ).toBeFalsy();
						expect( args.expectedResults.map( p => path.resolve( srcPath, p ) ).map( fs.existsSync ) ).toNotContain( false );
						done();
					});
			});
		});
	}
}
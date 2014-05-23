/// <reference path="../../lib/node/node.d.ts" />

module erecruit.TsT.Tests.Integration {

	// I'll be part of "/bin/tests/testSpec.js" at runtime, so "." maps to "/bin/tests"
	var srcPath = path.dirname( require.resolve( "../../tests/integration/src/common.ts" ) );
	var workingDir = path.resolve( srcPath, ".." );
	var expectedResults = ["common.cs"];
	
	describe( "tstc", () => {
		it( "should successfully compile the test input set", (done: Function) => {

			expectedResults.filter( fs.existsSync ).map( fs.unlinkSync );

			require( 'child_process' ).exec(
				['node', require.resolve( "../tstc.js" ), "-c", "src/.tstconfig", "src/common.ts"].join( ' ' ),
				{ cwd: workingDir, stdio: ['ignore', 'ignore', 'pipe'] },
				( err: any, stdout: string, stderr: string ) => {
					expect( stderr ).toBeFalsy();
					expect( expectedResults.map( p => path.resolve( srcPath, p ) ).map( fs.existsSync ) ).toNotContain( false );
					done();
				});
		});
	});
}
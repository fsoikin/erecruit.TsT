/// <reference path="../typings/index.d.ts" />
import * as fs from 'fs'
import * as path from 'path'
import * as childproc from 'child_process'
import { debug } from '../src/utils'

/* 
 * This set of tests simply runs tstc.js (Node-based transpiler) through 
 * some examples in the ./examples folder, and checks that it didn't crash,
 * plus samples some of the expected results.
 */

describe( "tstc", () => {

	def( {
		name: "C# example",
		aFileInSourceDir: "examples/csharp/.tstconfig",
		expectedResults: ["../module.cs"],
		tstcArgs: "-c .tstconfig ../module.ts"
	});

	def( {
		name: "F# example",
		aFileInSourceDir: "examples/fsharp/.tstconfig",
		expectedResults: ["../module.fs"],
		tstcArgs: "-c .tstconfig ../module.ts"
	});

	function def( args: { name: string; aFileInSourceDir: string; expectedResults: string[]; tstcArgs: string }) {
	
		// I'll be part of "/built/tests/integration.js" at runtime, so "." maps to "/built/tests"
		var srcPath = path.dirname( require.resolve( "../../" + args.aFileInSourceDir ) );
		var expectedResults = args.expectedResults.map(p => path.resolve(srcPath, p));
		debug(() => expectedResults.join(","));

		it( "should successfully compile " + args.name, ( done: Function ) => {

			expectedResults.filter( fs.existsSync ).map( fs.unlinkSync );

			childproc.exec(
				['node', require.resolve("../src/tstc.js"), "-d -v " + args.tstcArgs].join( ' ' ),
				<any>{ cwd: srcPath, stdio: ['ignore', 'ignore', 'pipe'] },
				(err: any, stdout: string, stderr: string) => {
					debug(() => stdout);
					expect( stderr ).toBeFalsy();
					expect( expectedResults.map( fs.existsSync ) ).not.toContain( false );
					done();
				});
		});
	}
});
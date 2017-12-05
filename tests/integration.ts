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
		expectedResults: [ 
			{ file: "../module.cs",
			  expectedContent: ["public class Range<T>", "public T Start { get; set; }", "public enum Colors", "Red = 0"] 
			} ],
		tstcArgs: "-c .tstconfig ../module.ts"
	});

	def( {
		name: "F# example",
		aFileInSourceDir: "examples/fsharp/.tstconfig",
		expectedResults: [ { 
			file: "../module.fs", 
			expectedContent: ["type Range<'T>", "Start: 'T", "type Colors =", "| Red = 0"] } ],
		tstcArgs: "-c .tstconfig ../module.ts"
	});

	function def( args: { 
		name: string; 
		aFileInSourceDir: string; 
		expectedResults: {file: string; expectedContent: string[]}[]; 
		tstcArgs: string }) 
	{
	
		// I'll be part of "/built/tests/integration.js" at runtime, so "." maps to "/built/tests"
		var srcPath = path.dirname( require.resolve( "../../" + args.aFileInSourceDir ) );

		it( "should successfully compile " + args.name, ( done: Function ) => {

			args.expectedResults.forEach( f => {
				const file = path.resolve(srcPath, f.file);
				if ( fs.existsSync( file ) ) fs.unlinkSync( file );
			} );

			childproc.exec(
				['node', require.resolve("../src/tstc.js"), "-d -v " + args.tstcArgs].join( ' ' ),
				<any>{ cwd: srcPath, stdio: ['ignore', 'ignore', 'pipe'] },
				(err: any, stdout: string, stderr: string) => {
					debug(() => stdout);
					expect( stderr ).toBeFalsy();
					args.expectedResults.forEach( f => {
						const file = path.resolve(srcPath, f.file);
						expect( fs.existsSync( file ) ).toBeTruthy();

						const content = fs.readFileSync( file, "utf8" );
						f.expectedContent.forEach( c => expect(content).toContain(c) );
					} );

					done();
				});
		});
	}
});
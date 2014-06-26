/// <reference path="../lib/jasmine/jasmine.d.ts" />
/// <reference path="../src/utils.ts" />

module erecruit.TsT.Tests.Helpers {

	describe( "fs helper", () => {

		beforeEach( () => {
			
		});

		group( "dirName", () => {
			it( " should return parent path for a regular input", (cb) => {
				var cfg = Config.toDustContext( {
					File: null, Original: null,
					Host: <any>{ GetParentDirectory: ( path: string ) => "parent: " + path }
				});

				assertRender( "{@fs_dirName path=\"x/y/z\" /}", cfg, "parent: x/y/z", cb );
			});
		});

		group( "fileNameWithoutExtension", () => {
			it( " should return the whole file name when GetParentDirectory returns a dot", ( cb ) => {
				var cfg = Config.toDustContext( {
					File: null, Original: null,
					Host: <any>{ GetParentDirectory: ( path: string ) => "." }
				});

				assertRender( "{@fs_fileNameWithoutExtension path=\"file.ext\" /}", cfg, "file", cb );
			});

			it( " should return the whole file name when GetParentDirectory returns empty string", ( cb ) => {
				var cfg = Config.toDustContext( {
					File: null, Original: null,
					Host: <any>{ GetParentDirectory: ( path: string ) => "" }
				});

				assertRender( "{@fs_fileNameWithoutExtension path=\"file.ext\" /}", cfg, "file", cb );
			});
		});
	});

	function assertRender( template: string, context: dust.Context, expectedResult: string, cb: (err?: string) => any ) {
		dust.compileFn( template )( context, ( err, res ) => {
			expect( err ).toBeNull();
			expect( res ).toEqual( expectedResult );
			cb();
		});
	}
}
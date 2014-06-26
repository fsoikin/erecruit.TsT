/// <reference path="../lib/jasmine/jasmine.d.ts" />
/// <reference path="../src/utils.ts" />

module erecruit.TsT.Tests.Helpers {

	describe( "fs helper", () => {

		beforeEach( () => {
			
		});

		group( "dirName", () => {
			fit( " should return parent path for a regular input", (cb) => {
				var cfg = Config.toDustContext( {
					File: null, Original: null,
					Host: <any>{ GetParentDirectory: ( path: string ) => "parent: " + path }
				});

				assertRender( "{@fs_dirName path=\"x/y/z\" /}", cfg, "parent: x/y/z", cb );
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
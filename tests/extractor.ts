/// <reference path="../lib/jasmine/jasmine.d.ts" />
/// <reference path="../src/extractor.ts" />
/// <reference path="../src/interfaces.ts" />

module erecruit.TsT.Tests {
	var path = require( "path" );

	describe( "Extractor", () => {

		var e: Extractor;
		var file: string;
		var fileName = "a.ts";

		beforeEach( () => {
			e = new Extractor( {
				DirectoryExists: _ => false,
				FetchFile: name => name === fileName ? file : null,
				GetParentDirectory: _ => "",
				MakeRelativePath: _ => "",
				ResolveRelativePath: _ => ""
			});
		});

		it( "should correctly parse simple data structure", () => {
			file = "export interface X { A: string; B: number; }";
			var mod = e.GetModule( fileName );
			expect( mod.Types ).toEqual( [{
				Interface: {
					Name: 'X',
					Properties: [
						{ Name: 'A', Type: { Primitive: PrimitiveType.String } },
						{ Name: 'B', Type: { Primitive: PrimitiveType.Number } }
					]
				}
			}] );
		});

	});
}
module erecruit.TsT.Tests.Extr {

	export function modules() {
		it( "should interpret declarations from explicitly declared external modules as coming from their own files", () => {
			files['x.d.ts'] = "decalre module 'x' { export interface I { X: string; } }";
			file = "/// <reference path='x.d.ts' />\r\n import x = require('x'); export interface J { i: x.I; }";
			var types = e.GetDocument( fileName ).Types.map( t => t.Interface() );
			expect( types.length ).toEqual( 1 );
			expect( types ).toEqual( [c( { Name: 'J' })] );
			expect( types[0].Properties ).toEqual( [c( { Name: 'i' })] );
			expect( types[0].Properties[0].Type ).toEqual(
				c( {
					Document: c( { Path: "x.d.ts" }),
					ExternalModule: '"x"'
				})
				);
			expect( types[0].Properties[0].Type.Interface().Name ).toEqual( 'I' );
			expect( types[0].Properties[0].Type.InternalModule ).toBeFalsy();
		});

		it( "should not return any InternalModule for top-level types", () => {
			file = "export interface I { }";
			var types = e.GetDocument( fileName ).Types;
			expect( types.length ).toEqual( 1 );
			expect( types[0].InternalModule ).toBeFalsy();
		});

		it( "should, for regular .ts files, return ExternalModule as quoted file name", () => {
			file = "export interface I { }";
			var types = e.GetDocument( fileName ).Types;
			expect( types.length ).toEqual( 1 );
			expect( types[0].ExternalModule ).toEqual( '"' + fileName + '"' );
		});

		it( "should, for .d.ts files, return ExternalModule exactly as declared", () => {
			files["x.d.ts"] = "declare module 'module' { export interface I { } }";
			var types = e.GetDocument( "x.d.ts" ).Types;
			expect( types.length ).toEqual( 1 );
			expect( types[0].ExternalModule ).toEqual( '"module"' );
		});
	}
}
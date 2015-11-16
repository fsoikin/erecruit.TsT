module erecruit.TsT.Tests.Extr {

	export function modules() {
		it( "should interpret declarations from explicitly declared external modules as coming from their own files", () => {
			extraFiles['x.d.ts'] = "decalre module \"x\" { export interface I { X: string; } }";
			file = "/// <reference path='x.d.ts' />\r\n import x = require('x'); export interface J { i: x.I; }";
			var types = e().GetDocument( fileName ).Types.map( t => t.Interface() );
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
			var types = e().GetDocument( fileName ).Types;
			expect( types.length ).toEqual( 1 );
			expect( types[0].InternalModule ).toBeFalsy();
		});

		it( "should return InternalModule for types within a module", () => {
			file = "module M { export interface I { } }";
			var types = e().GetDocument( fileName ).Types;
			expect( types.length ).toEqual( 1 );
			expect( types[0].InternalModule ).toEqual( "M" );
		});

		it( "should return InternalModule for types within nested modules", () => {
			file = `module M { 
				export interface I { } 
				module X {
					module Y.Z {
						export interface J { }
					}
				}
			}`;
			var types = e().GetDocument( fileName ).Types;
			expect( types.length ).toEqual( 2 );
			expect( types[0].InternalModule ).toEqual( "M" );
			expect( types[0].Interface().Name ).toEqual( "I" );
			expect( types[1].InternalModule ).toEqual( "M.X.Y.Z" );
			expect( types[1].Interface().Name ).toEqual( "J" );
		});

		it( "should, for regular .ts files, return ExternalModule as quoted file name", () => {
			file = "export interface I { }";
			var types = e().GetDocument( fileName ).Types;
			expect( types.length ).toEqual( 1 );
			expect( types[0].ExternalModule ).toEqual( '"' + fileName + '"' );
		});

		it( "should, for .d.ts files, return ExternalModule exactly as declared", () => {
			extraFiles["x.d.ts"] = "declare module 'module' { export interface I { } }";
			file = "import m = require('module'); export interface J extends m.I { }";
			let types = e().GetDocument( fileName ).Types;
			let J = types[0];
			let I = J.Interface().Extends[0];
			expect( types.length ).toEqual( 1 );
			expect( I.ExternalModule ).toEqual( "'module'" );
		});
	}
}
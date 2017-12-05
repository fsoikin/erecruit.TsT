/// <reference path="../typings/index.d.ts" />
import { group } from './utils'
import { trimAndUnwrapAll, trimAndUnwrapAllClasses, state, c  } from './extractor'

export default function() {
	it( "should interpret declarations from explicitly declared external modules as coming from their own files", () => {
		state.extraFiles['x.d.ts'] = "decalre module \"x\" { export interface I { X: string; } }";
		state.file.contents = "/// <reference path='x.d.ts' />\r\n import x = require('x'); export interface J { i: x.I; }";
		var types = state.e().GetDocument( state.file.name ).Types.map( t => t.Interface() );
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
		state.file.contents = "export interface I { }";
		var types = state.e().GetDocument( state.file.name ).Types;
		expect( types.length ).toEqual( 1 );
		expect( types[0].InternalModule ).toBeFalsy();
	});

	it( "should return InternalModule for types within a module", () => {
		state.file.contents = "module M { export interface I { } }";
		var types = state.e().GetDocument( state.file.name ).Types;
		expect( types.length ).toEqual( 1 );
		expect( types[0].InternalModule ).toEqual( "M" );
	});

	it( "should return InternalModule for types within nested modules", () => {
		state.file.contents = `module M { 
			export interface I { } 
			module X {
				module Y.Z {
					export interface J { }
				}
			}
		}`;
		var types = state.e().GetDocument( state.file.name ).Types;
		expect( types.length ).toEqual( 2 );
		expect( types[0].InternalModule ).toEqual( "M" );
		expect( types[0].Interface().Name ).toEqual( "I" );
		expect( types[1].InternalModule ).toEqual( "M.X.Y.Z" );
		expect( types[1].Interface().Name ).toEqual( "J" );
	});

	it( "should, for regular .ts files, return ExternalModule as quoted file name", () => {
		state.file.contents = "export interface I { }";
		var types = state.e().GetDocument( state.file.name ).Types;
		expect( types.length ).toEqual( 1 );
		expect( types[0].ExternalModule ).toEqual( '"' + state.file.name + '"' );
	});

	it( "should, for .d.ts files, return ExternalModule exactly as declared", () => {
		state.extraFiles["x.d.ts"] = "declare module 'module' { export interface I { } }";
		state.file.contents = "import m = require('module'); export interface J extends m.I { }";
		let types = state.e().GetDocument( state.file.name ).Types;
		let J = types[0];
		let I = J.Interface().Extends[0];
		expect( types.length ).toEqual( 1 );
		expect( I.ExternalModule ).toEqual( "'module'" );
	});
}

/// <reference path="../typings/index.d.ts" />
import { Method } from '../src/interfaces'
import { group } from './utils'
import { trimAndUnwrapAll, trimAndUnwrapAllClasses, state, c } from './extractor'

export default function() {
	group( "should extract comments", () => {
		it( "on interfaces", () => {
			state.file.contents = "/** A comment*/ export interface I {}";
			var types = trimAndUnwrapAll( state.e().GetDocument( state.file.name ).Types, false );
			expect( types.length ).toEqual( 1 );
			expect( types[0].Comment ).toEqual( "A comment" );
			expect( ( <any>types[0].Interface ).Name ).toEqual( "I" );
		});

		it( "on classes", () => {
			state.file.contents = "/** A comment*/ export class C {}";
			expect( state.e().GetDocument( state.file.name ).Classes ).toEqual( [
				c( { Comment: "A comment", Name: "C" })
			] );
		});

		it( "on variables with construct signatures", () => {
			state.file.contents = "/** A comment*/ export var C: { new(): string } = null";
			expect( state.e().GetDocument( state.file.name ).Classes ).toEqual( [
				c( { Comment: "A comment", Name: "C" })
			] );
		});

		it( "on properties", () => {
			state.file.contents = "export interface I { \r\n\
								/** A comment*/ X: string \
							}";
			expect( trimAndUnwrapAll( state.e().GetDocument( state.file.name ).Types, false )[0] ).toEqual( c( {
				Interface: c( {
					Properties: [
						c( {
							Comment: "A comment",
							Name: 'X'
						})
					]
				})
			}) );
		});

		it( "on methods", () => {
			state.file.contents = "export interface I { \r\n\
								/** Comment 1*/ X(): string; \r\n\
								/** Comment 2*/ X( p: number ): number;\
							}";
			var m = <Method>( <any>trimAndUnwrapAll( state.e().GetDocument( state.file.name ).Types, false )[0].Interface ).Methods[0];
			expect( m.Name ).toEqual( 'X' );
			expect( m.Signatures.sort( ( a, b ) => a.Parameters.length - b.Parameters.length ) ).toEqual( [
				c( { Comment: "Comment 1", Parameters: [] }),
				c( { Comment: "Comment 2", Parameters: [c( { Name: 'p' })] })
			] );
		});
	});
}
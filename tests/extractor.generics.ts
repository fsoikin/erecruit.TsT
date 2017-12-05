/// <reference path="../typings/index.d.ts" />
import { PrimitiveType } from '../src/interfaces'
import { group } from './utils'
import { trimAndUnwrapAll, trimAndUnwrapAllClasses, state, c } from './extractor'

export default function() {

	group( "should correctly parse generic interfaces", () => {
		it( "with one parameter", () => {
			state.file.contents = "export interface I<T> { X: T[]; Y: T; }";
			expect( trimAndUnwrapAll( state.e().GetDocument( state.file.name ).Types ).map( t => t.Interface ) ).toEqual( [
				c( {
					Name: 'I',
					GenericParameters: [c( { GenericParameter: { Name: 'T', Constraint: null } })],
					Properties: [
						{ Name: 'X', Type: c( { Array: c( { GenericParameter: { Name: 'T', Constraint: null } }) }) },
						{ Name: 'Y', Type: c( { GenericParameter: { Name: 'T', Constraint: null } }) },
					]
				})
			] );
		});

		it( "with two parameters", () => {
			state.file.contents = "export interface I<T,S> { X: T[]; Y: S; }";
			expect( trimAndUnwrapAll( state.e().GetDocument( state.file.name ).Types ).map( t => t.Interface ) ).toEqual( [
				c( {
					Name: 'I',
					GenericParameters: [
						c( { GenericParameter: { Name: 'T', Constraint: null } }),
						c( { GenericParameter: { Name: 'S', Constraint: null } })
					],
					Properties: [
						{ Name: 'X', Type: c( { Array: c( { GenericParameter: { Name: 'T', Constraint: null } }) }) },
						{ Name: 'Y', Type: c( { GenericParameter: { Name: 'S', Constraint: null } }) },
					]
				})
			] );
		});

		it( "inheriting from other generic interfaces", () => {
			state.file.contents = "export interface I<T> extends J<T> { X: T[]; } export interface J<S> { Y: S }";
			expect( trimAndUnwrapAll( state.e().GetDocument( state.file.name ).Types ).map( t => t.Interface ) ).toEqual( [
				c( {
					Name: 'I',
					GenericParameters: [{ GenericParameter: { Name: 'T', Constraint: null } }],
					Extends: [c( {
						GenericInstantiation: {
							Definition: 'J',
							Arguments: [{ GenericParameter: c( { Name: 'T' }) }]
						}
					})],
					Properties: [
						{ Name: 'X', Type: { Array: { GenericParameter: { Name: 'T', Constraint: null } } } },
					]
				}),
				c( {
					Name: 'J',
					GenericParameters: [{ GenericParameter: { Name: 'S', Constraint: null } }],
					Properties: [{ Name: 'Y', Type: { GenericParameter: c( { Name: 'S' }) } }]
				})
			] );
		});

		it( "inheriting from other generic interfaces with multiple inheritance clauses", () => {
			state.file.contents = `
				export interface I<T> extends J<T> { X: T[]; }
				export interface J<S> { Y: S } 
				export interface K<U> { Z: U }
				export interface I<T> extends K<T[]> {}
			`;
			expect( trimAndUnwrapAll( state.e().GetDocument( state.file.name ).Types ).map( t => t.Interface ) ).toEqual( [
				c( {
					Name: 'I',
					GenericParameters: [{ GenericParameter: { Name: 'T', Constraint: null } }],
					Extends: [
						c( {
							GenericInstantiation: {
								Definition: 'J',
								Arguments: [{ GenericParameter: c( { Name: 'T' }) }]
							}
						}),
						c( {
							GenericInstantiation: {
								Definition: 'K',
								Arguments: [ { Array: { GenericParameter: c( { Name: 'T' }) } } ]
							}
						})],
					Properties: [
						{ Name: 'X', Type: { Array: { GenericParameter: { Name: 'T', Constraint: null } } } },
					]
				}),
				c( { Name: 'J' }),
				c( { Name: 'K' })
			] );
		});

		it( "concretely instantiated and used in a base type position", () => {
			state.file.contents = "export interface I extends J<number> { } export interface J<S> { Y: S }";
			expect( trimAndUnwrapAll( state.e().GetDocument( state.file.name ).Types ).map( t => t.Interface ) ).toEqual( [
				c( {
					Name: 'I',
					Extends: [{
						GenericInstantiation: {
							Definition: 'J',
							Arguments: [c( { PrimitiveType: PrimitiveType.Number })]
						}
					}]
				}),
				c( {
					Name: 'J',
					GenericParameters: [{ GenericParameter: { Name: 'S', Constraint: null } }],
					Properties: [{ Name: 'Y', Type: { GenericParameter: c( { Name: 'S' }) } }]
				})
			] );
		});

		it( "with parameters constrained by regular types", () => {
			state.file.contents = "export interface I<T extends J> { X: T; } export interface J {}";
			expect( trimAndUnwrapAll( state.e().GetDocument( state.file.name ).Types ).map( t => t.Interface ) ).toEqual( [
				c( {
					Name: 'I',
					GenericParameters: [
						c( { GenericParameter: { Name: 'T', Constraint: c( { Interface: c( { Name: 'J' }) }) } })
					],
					Properties: [
						{ Name: 'X', Type: c( { GenericParameter: c( { Name: 'T' }) }) },
					]
				}),
				c( { Name: 'J' })
			] );
		});

	});
}
/// <reference path="../typings/index.d.ts" />
import { PrimitiveType, Interface } from '../src/interfaces'
import { group } from './utils'
import { trimAndUnwrapAll, trimAndUnwrapAllClasses, state, c } from './extractor'

export default function() {
	group( "should correctly parse data structure", () => {
		it( " - simple", () => {
			state.file.contents = "export interface X { A: string; B: number; }";
			expect( trimAndUnwrapAll( state.e().GetDocument( state.file.name ).Types ).map( t => t.Interface ) ).toEqual( [
				c( {
					Name: 'X',
					Properties: [
						{ Name: 'A', Type: c( { PrimitiveType: PrimitiveType.String }) },
						{ Name: 'B', Type: c( { PrimitiveType: PrimitiveType.Number }) }
					]
				})
			] );
		});

		it( "with a substructure", () => {
			state.file.contents = "export interface X { A: string; B: Y; } export interface Y { C: number; }";
			expect( trimAndUnwrapAll( state.e().GetDocument( state.file.name ).Types ).map( t => t.Interface ) ).toEqual( [
				c( {
					Name: 'X',
					Properties: [
						{ Name: 'A', Type: c( { PrimitiveType: PrimitiveType.String }) },
						{ Name: 'B', Type: c( { Interface: c( { Name: 'Y' }) }) }
					]
				}),
				c( {
					Name: 'Y',
					Properties: [
						{ Name: 'C', Type: c( { PrimitiveType: PrimitiveType.Number }) },
					]
				})
			] );
		});
	});

	group( "should correctly parse an interface", () => {
		it( "with methods", () => {
			state.file.contents = "export interface I { M( x: string ): number; N( x: number ): string; }";
			expect( trimAndUnwrapAll( state.e().GetDocument( state.file.name ).Types ).map( t => t.Interface ) ).toEqual( [
				c( {
					Name: 'I',
					Methods: [
						{
							Name: 'M',
							Signatures: [c( {
								Parameters: [c( { Name: 'x', Type: c( { PrimitiveType: PrimitiveType.String }) })],
								ReturnType: c( { PrimitiveType: PrimitiveType.Number })
							})]
						},
						{
							Name: 'N',
							Signatures: [c( {
								Parameters: [c( { Name: 'x', Type: c( { PrimitiveType: PrimitiveType.Number }) })],
								ReturnType: c( { PrimitiveType: PrimitiveType.String })
							})]
						}
					]
				})
			] );
		});

		it( "with multiple method overloads", () => {
			state.file.contents = "export interface I { M( x: string ): number; M( x: number ): string; }";
			expect( trimAndUnwrapAll( state.e().GetDocument( state.file.name ).Types ).map( t => t.Interface ) ).toEqual( [
				c( {
					Name: 'I',
					Methods: [
						{
							Name: 'M',
							Signatures: [
								c( {
									Parameters: [c( { Name: 'x', Type: c( { PrimitiveType: PrimitiveType.String }) })],
									ReturnType: c( { PrimitiveType: PrimitiveType.Number })
								}),
								c( {
									Parameters: [c( { Name: 'x', Type: c( { PrimitiveType: PrimitiveType.Number }) })],
									ReturnType: c( { PrimitiveType: PrimitiveType.String })
								})
							]
						}
					]
				})
			] );
		});
	});

	group( "should correctly parse enums", () => {
		it( "with implicit values", () => {
			state.file.contents = "export enum X { A, B, C }";
			expect( trimAndUnwrapAll( state.e().GetDocument( state.file.name ).Types ).map( t => t.Enum() ) ).toEqual( [
				c( {
					Name: 'X',
					Values: [{ Name: 'A', Value: 0 }, { Name: 'B', Value: 1 }, { Name: 'C', Value: 2 }]
				})
			] );
		});

		it( "with explicit values", () => {
			state.file.contents = "export enum X { A = 5, B = 8, C = 10 }";
			expect( trimAndUnwrapAll( state.e().GetDocument( state.file.name ).Types ).map( t => t.Enum() ) ).toEqual( [
				c( {
					Name: 'X',
					Values: [{ Name: 'A', Value: 5 }, { Name: 'B', Value: 8 }, { Name: 'C', Value: 10 }]
				})
			] );
		});

		it( "with compound values", () => {
			state.file.contents = "export enum X { A = 1, B = 2, C = 6, \
				D = A | B, E = B & C, F = ~B \
				G = A + B, H = B - C, I = C ^ B, \
				J = -B }";
			expect( trimAndUnwrapAll( state.e().GetDocument( state.file.name ).Types ).map( t => t.Enum() ) ).toEqual( [
				c( {
					Name: 'X',
					Values: [{ Name: 'A', Value: 1 }, { Name: 'B', Value: 2 }, { Name: 'C', Value: 6 },
						{ Name: 'D', Value: 1 | 2 }, { Name: 'E', Value: 2 & 6 }, { Name: 'F', Value: ~2 },
						{ Name: 'G', Value: 1 + 2 }, { Name: 'H', Value: 2 - 6 }, { Name: 'I', Value: 6 ^ 2 },
						{ Name: 'J', Value: -2 }]
				})
			] );
		});
	});

	it( "should correctly parse array-typed properties", () => {
		state.file.contents = "export interface I { X: string[]; Y: number[]; Z: J[]; } export interface J {}";
		expect( trimAndUnwrapAll( state.e().GetDocument( state.file.name ).Types ).map( t => t.Interface ) ).toEqual( [
			c( {
				Name: 'I',
				Properties: [
					{ Name: 'X', Type: c( { Array: c( { PrimitiveType: PrimitiveType.String }) }) },
					{ Name: 'Y', Type: c( { Array: c( { PrimitiveType: PrimitiveType.Number }) }) },
					{ Name: 'Z', Type: c( { Array: c( { Interface: c( { Name: 'J' }) }) }) },
				]
			}),
			c( { Name: 'J' })
		] );
	});

	it( "should not flatten interface hierarchy when enumerating properties", () => {
		state.file.contents = `
				export class I { X: string; Y: number; }
				export interface J extends I { A: boolean }
				export interface K extends J { B: any }`;
		var types = <Interface[]><any[]>trimAndUnwrapAll( state.e().GetDocument( state.file.name ).Types ).map( t => t.Interface );
		expect( types.map( t => t.Name ) ).toEqual( ["I", "J", "K"] );
		expect( types.map( t => t.Properties.length ) ).toEqual( [2, 1, 1] );
	});

	it( "should ignore private properties on interfaces", () => {
		state.file.contents = "export class I { X: string; private Y: number; }";
		var types = <Interface[]><any[]>trimAndUnwrapAll( state.e().GetDocument( state.file.name ).Types ).map( t => t.Interface );
		expect( types ).toEqual( [c( { Name: 'I' })] );
		expect( types[0].Properties ).toEqual( [c( { Name: 'X' })] );
	});

	it( "should return null name for anonymous types", () => {
		state.file.contents = "export interface I { X: { y: number } }";
		let types = state.e().GetDocument( state.file.name ).Types;
		let I = types[0];
		let X = I.Interface().Properties[0];
		let anonymous = X.Type;
		expect( anonymous.Interface().Name ).toBeNull();
	});

	it( "should correctly detect primitive types, including 'any'", () => {
		state.file.contents = "export interface I { X: any; Y: string; Z: number; W: boolean; }";
		let types = state.e().GetDocument( state.file.name ).Types;
		let I = types[0].Interface();
		let props = I.Properties;
		expect( props.map( p => p.Type.PrimitiveType ) ).toEqual( [PrimitiveType.Any, PrimitiveType.String, PrimitiveType.Number, PrimitiveType.Boolean] );
	});

	it( "should correctly return properties for anonymous types", () => {
		state.file.contents = "export interface I { X: { y: number; z?: string } }";
		let types = state.e().GetDocument( state.file.name ).Types;
		let I = types[0];
		let X = I.Interface().Properties[0];
		let props = X.Type.Interface().Properties;
		expect( props.map( p => p.Name ) ).toEqual( ["y", "z"] );
		expect( props.map( p => p.Type.PrimitiveType ) ).toEqual( [PrimitiveType.Number, PrimitiveType.String] );
	});
}
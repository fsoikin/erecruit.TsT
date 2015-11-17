module erecruit.TsT.Tests.Extr {

	export function types() {
		group( "should correctly parse data structure", () => {
			it( " - simple", () => {
				file = "export interface X { A: string; B: number; }";
				expect( trimAndUnwrapAll( e().GetDocument( fileName ).Types ).map( t => t.Interface ) ).toEqual( [
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
				file = "export interface X { A: string; B: Y; } export interface Y { C: number; }";
				expect( trimAndUnwrapAll( e().GetDocument( fileName ).Types ).map( t => t.Interface ) ).toEqual( [
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
				file = "export interface I { M( x: string ): number; N( x: number ): string; }";
				expect( trimAndUnwrapAll( e().GetDocument( fileName ).Types ).map( t => t.Interface ) ).toEqual( [
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
				file = "export interface I { M( x: string ): number; M( x: number ): string; }";
				expect( trimAndUnwrapAll( e().GetDocument( fileName ).Types ).map( t => t.Interface ) ).toEqual( [
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
				file = "export enum X { A, B, C }";
				expect( trimAndUnwrapAll( e().GetDocument( fileName ).Types ).map( t => t.Enum() ) ).toEqual( [
					c( {
						Name: 'X',
						Values: [{ Name: 'A', Value: 0 }, { Name: 'B', Value: 1 }, { Name: 'C', Value: 2 }]
					})
				] );
			});

			it( "with explicit values", () => {
				file = "export enum X { A = 5, B = 8, C = 10 }";
				expect( trimAndUnwrapAll( e().GetDocument( fileName ).Types ).map( t => t.Enum() ) ).toEqual( [
					c( {
						Name: 'X',
						Values: [{ Name: 'A', Value: 5 }, { Name: 'B', Value: 8 }, { Name: 'C', Value: 10 }]
					})
				] );
			});

			it( "with compound values", () => {
				file = "export enum X { A = 1, B = 2, C = 6, \
					D = A | B, E = B & C, F = ~B \
					G = A + B, H = B - C, I = C ^ B, \
					J = -B }";
				expect( trimAndUnwrapAll( e().GetDocument( fileName ).Types ).map( t => t.Enum() ) ).toEqual( [
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
			file = "export interface I { X: string[]; Y: number[]; Z: J[]; } export interface J {}";
			expect( trimAndUnwrapAll( e().GetDocument( fileName ).Types ).map( t => t.Interface ) ).toEqual( [
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

		it( "should ignore private properties on interfaces", () => {
			file = "export class I { X: string; private Y: number; }";
			var types = <Interface[]><any[]>trimAndUnwrapAll( e().GetDocument( fileName ).Types ).map( t => t.Interface );
			expect( types ).toEqual( [c( { Name: 'I' })] );
			expect( types[0].Properties ).toEqual( [c( { Name: 'X' })] );
		});

		it( "should return null name for anonymous types", () => {
			file = "export interface I { X: { y: number } }";
			let types = e().GetDocument( fileName ).Types;
			let I = types[0];
			let X = I.Interface().Properties[0];
			let anonymous = X.Type;
			expect( anonymous.Interface().Name ).toBeNull();
		});

		it( "should correctly detect primitive types, including 'any'", () => {
			file = "export interface I { X: any; Y: string; Z: number; W: boolean; }";
			let types = e().GetDocument( fileName ).Types;
			let I = types[0].Interface();
			let props = I.Properties;
			expect( props.map( p => p.Type.PrimitiveType ) ).toEqual( [PrimitiveType.Any, PrimitiveType.String, PrimitiveType.Number, PrimitiveType.Boolean] );
		});
	}
}
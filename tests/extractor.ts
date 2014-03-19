/// <reference path="../lib/jasmine/jasmine.d.ts" />
/// <reference path="../src/extractor.ts" />
/// <reference path="../src/interfaces.ts" />

module erecruit.TsT.Tests {
	var path = require( "path" );
	var fs = require( "fs" );
	var c = jasmine.objectContaining;

	describe( "Extractor", () => {

		var e: Extractor;
		var file: string;
		var fileName = "a.ts";

		beforeEach( () => {
			e = new Extractor( <CachedConfig>{
				Original: { RootDir: '.', ConfigDir: '.' },
				File: [{ match: null, types: null }],
				Host: {
					DirectoryExists: _ => false,
					FetchFile: name => name === fileName ? file : fs.existsSync( name ) ? fs.readFileSync( name, { encoding: 'utf8' }) : null,
					GetParentDirectory: _ => "",
					MakeRelativePath: (from, to) => to,
					ResolveRelativePath: _ => "",
					GetIncludedTypingFiles: () => [require.resolve( '../lib.d.ts' )]
				}
			});
		});

		describe( "should correctly parse data structure", () => {
			it( " - simple", () => {
				file = "export interface X { A: string; B: number; }";
				expect( e.GetModule( fileName ).Types ).toEqual( [c({
					Interface: c( {
						Name: 'X',
						Properties: [
							{ Name: 'A', Type: c( { PrimitiveType: PrimitiveType.String }) },
							{ Name: 'B', Type: c( { PrimitiveType: PrimitiveType.Number }) }
						]
					})
				})] );
			});

			it( "with a substructure", () => {
				file = "export interface X { A: string; B: Y; } export interface Y { C: number; }";
				expect( e.GetModule( fileName ).Types ).toEqual( [
					c({
						Interface: c( {
							Name: 'X',
							Properties: [
								{ Name: 'A', Type: c( { PrimitiveType: PrimitiveType.String }) },
								{ Name: 'B', Type: c( { Interface: c( { Name: 'Y' }) }) }
							]
						})
					}),
					c({
						Interface: c( {
							Name: 'Y',
							Properties: [
								{ Name: 'C', Type: c( { PrimitiveType: PrimitiveType.Number }) },
							]
						})
					})
				] );
			});
		});

		describe( "should correctly parse an interface", () => {
			it( "with methods", () => {
				file = "export interface I { M( x: string ): number; N( x: number ): string; }";
				expect( e.GetModule( fileName ).Types ).toEqual( [
					c( {
						Interface: c( {
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
					})
				] );
			});
			it( "with multiple method overloads", () => {
				file = "export interface I { M( x: string ): number; M( x: number ): string; }";
				expect( e.GetModule( fileName ).Types ).toEqual( [
					c( {
						Interface: c( {
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
					})
				] );
			});
		});

		describe( "should correctly parse enums", () => {
			it( "with implicit values", () => {
				file = "export enum X { A, B, C }";
				expect( e.GetModule( fileName ).Types ).toEqual( [
					c({
						Enum: c( {
							Name: 'X',
							Values: [{ Name: 'A', Value: 0 }, { Name: 'B', Value: 1 }, { Name: 'C', Value: 2 }]
						})
					})
				] );
			});

			it( "with explicit values", () => {
				file = "export enum X { A = 5, B = 8, C = 10 }";
				expect( e.GetModule( fileName ).Types ).toEqual( [
					c({
						Enum: c( {
							Name: 'X',
							Values: [{ Name: 'A', Value: 5 }, { Name: 'B', Value: 8 }, { Name: 'C', Value: 10 }]
						})
					})
				] );
			});

			it( "with compound values", () => {
				file = "export enum X { A = 1, B = 2, C = 6, \
					D = A | B, E = B & C, F = ~B \
					G = A + B, H = B - C, I = C ^ B, \
					J = -B }";
				expect( e.GetModule( fileName ).Types ).toEqual( [
					c({
						Enum: c( {
							Name: 'X',
							Values: [{ Name: 'A', Value: 1 }, { Name: 'B', Value: 2 }, { Name: 'C', Value: 6 },
								{ Name: 'D', Value: 1 | 2 }, { Name: 'E', Value: 2 & 6 }, { Name: 'F', Value: ~2 },
								{ Name: 'G', Value: 1 + 2 }, { Name: 'H', Value: 2 - 6 }, { Name: 'I', Value: 6 ^ 2 },
								{ Name: 'J', Value: -2 }]
						})
					})
				] );
			});
		});

		it( "should correctly parse array-typed properties", () => {
			file = "export interface I { X: string[]; Y: number[]; Z: J[]; } export interface J {}";
			expect( e.GetModule( fileName ).Types ).toEqual( [
				c( {
					Interface: c( {
						Name: 'I',
						Properties: [
							{ Name: 'X', Type: c( { Array: c( { PrimitiveType: PrimitiveType.String }) }) },
							{ Name: 'Y', Type: c( { Array: c( { PrimitiveType: PrimitiveType.Number }) }) },
							{ Name: 'Z', Type: c( { Array: c( { Interface: c( { Name: 'J' }) }) }) },
						]
					})
				}),
				c( { Interface: c( { Name: 'J' }) })
			] );
		});

		describe( "should correctly parse generic interfaces", () => {
			it( "with one parameter", () => {
				file = "export interface I<T> { X: T[]; Y: T; }";
				expect( e.GetModule( fileName ).Types ).toEqual( [
					c( {
						Interface: c( {
							Name: 'I',
							GenericParameters: [c( { GenericParameter: { Name: 'T', Constraint: null } })],
							Properties: [
								{ Name: 'X', Type: c( { Array: c( { GenericParameter: { Name: 'T', Constraint: null } }) }) },
								{ Name: 'Y', Type: c( { GenericParameter: { Name: 'T', Constraint: null } }) },
							]
						})
					})
				] );
			});

			it( "with two parameters", () => {
				file = "export interface I<T,S> { X: T[]; Y: S; }";
				expect( e.GetModule( fileName ).Types ).toEqual( [
					c( {
						Interface: c( {
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
					})
				] );
			});

			it( "inheriting from other generic interfaces", () => {
				file = "export interface I<T> extends J<T> { X: T[]; } export interface J<S> { Y: S }";
				expect( e.GetModule( fileName ).Types ).toEqual( [
					c( {
						Interface: c( {
							Name: 'I',
							GenericParameters: [ c( { GenericParameter: { Name: 'T', Constraint: null } }) ],
							Extends: [c( {
								GenericInstantiation: {
									Definition: c({ Name: 'J', GenericParameters: [c({ GenericParameter: { Name: 'S', Constraint: null } })] }),
									ParameterMaps: [{
										Parameter: c({ GenericParameter: c( { Name: 'S' }) }),
										Argument: c({ GenericParameter: c( { Name: 'T' }) })
									}]
								}
							})],
							Properties: [
								{ Name: 'X', Type: c( { Array: c( { GenericParameter: { Name: 'T', Constraint: null } }) }) },
							]
						})
					}),
					c( {
						Interface: c( {
							Name: 'J',
							GenericParameters: [ c( { GenericParameter: { Name: 'S', Constraint: null } }) ],
							Properties: [ { Name: 'Y', Type: c( { GenericParameter: c( { Name: 'S' }) }) } ]
						})
					})
				] );
			});

			it( "concretely instantiated and used in a base type position", () => {
				file = "export interface I extends J<number> { } export interface J<S> { Y: S }";
				expect( e.GetModule( fileName ).Types ).toEqual( [
					c( {
						Interface: c( {
							Name: 'I',
							Extends: [c( {
								GenericInstantiation: {
									Definition: c( { Name: 'J', GenericParameters: [c( { GenericParameter: { Name: 'S', Constraint: null } })] }),
									ParameterMaps: [{
										Parameter: c( { GenericParameter: c( { Name: 'S' }) }),
										Argument: c( { PrimitiveType: PrimitiveType.Number })
									}]
								}
							})]
						})
					}),
					c( {
						Interface: c( {
							Name: 'J',
							GenericParameters: [c( { GenericParameter: { Name: 'S', Constraint: null } })],
							Properties: [{ Name: 'Y', Type: c( { GenericParameter: c( { Name: 'S' }) }) }]
						})
					})
				] );
			});

			it( "with parameters constrained by regular types", () => {
				file = "export interface I<T extends J> { X: T; } export interface J {}";
				expect( e.GetModule( fileName ).Types ).toEqual( [
					c( {
						Interface: c( {
							Name: 'I',
							GenericParameters: [
								c( { GenericParameter: { Name: 'T', Constraint: c( { Interface: c( { Name: 'J' }) }) } })
							],
							Properties: [
								{ Name: 'X', Type: c( { GenericParameter: c( { Name: 'T' }) }) },
							]
						})
					}),
					c( { Interface: c( { Name: 'J' }) } )
				] );
			});

		});
	});
}
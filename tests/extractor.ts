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
		var files: { [name: string]: string };
		var fileName = "a.ts";

		beforeEach( () => {
			file = null;
			files = {};
			e = new Extractor( <CachedConfig>{
				Original: { RootDir: '.', ConfigDir: '.' },
				File: [{ match: null, types: null }],
				Host: {
					DirectoryExists: _ => false,
					FetchFile: name =>
						( name === fileName && file ) ||
						files[name] ||
						fs.existsSync( name ) && fs.readFileSync( name, { encoding: 'utf8' })
						|| null,
					GetParentDirectory: _ => "",
					MakeRelativePath: (from, to) => to,
					ResolveRelativePath: (path, directory) => path,
					GetIncludedTypingFiles: () => [require.resolve( '../lib.d.ts' )]
				}
			});
		});

		var oldStringify: (obj:any, replacer: any, space: string) => string;
		beforeEach( () => {
			oldStringify = JSON.stringify;
			(<any>JSON)['stringify'] = ( obj: any, replacer: any ) => oldStringify( obj, replacer, '\t' );
		});
		afterEach( () => ( <any>JSON )['stringify'] = oldStringify );

		describe( "should correctly parse data structure", () => {
			it( " - simple", () => {
				file = "export interface X { A: string; B: number; }";
				expect( trimTypes( e.GetDocument( fileName ).Types ) ).toEqual( [c({
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
				expect( trimTypes( e.GetDocument( fileName ).Types ) ).toEqual( [
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
				expect( trimTypes( e.GetDocument( fileName ).Types ) ).toEqual( [
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
				expect( trimTypes( e.GetDocument( fileName ).Types ) ).toEqual( [
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
				expect( trimTypes( e.GetDocument( fileName ).Types ) ).toEqual( [
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
				expect( trimTypes( e.GetDocument( fileName ).Types ) ).toEqual( [
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
				expect( trimTypes( e.GetDocument( fileName ).Types ) ).toEqual( [
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
			expect( trimTypes( e.GetDocument( fileName ).Types ) ).toEqual( [
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
				expect( trimTypes( e.GetDocument( fileName ).Types ) ).toEqual( [
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
				expect( trimTypes( e.GetDocument( fileName ).Types ) ).toEqual( [
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
				expect( trimTypes( e.GetDocument( fileName ).Types ) ).toEqual( [
					{
						Interface: c( {
							Name: 'I',
							GenericParameters: [ { GenericParameter: { Name: 'T', Constraint: null } } ],
							Extends: [c( {
								GenericInstantiation: {
									Definition: 'J',
									Arguments: [ { GenericParameter: c( { Name: 'T' }) } ]
								}
							})],
							Properties: [
								{ Name: 'X', Type: { Array: { GenericParameter: { Name: 'T', Constraint: null } } } },
							]
						})
					},
					{
						Interface: c({
							Name: 'J',
							GenericParameters: [ { GenericParameter: { Name: 'S', Constraint: null } } ],
							Properties: [ { Name: 'Y', Type: { GenericParameter: c( { Name: 'S' }) } } ]
						})
					}
				] );
			});

			it( "concretely instantiated and used in a base type position", () => {
				file = "export interface I extends J<number> { } export interface J<S> { Y: S }";
				expect( trimTypes( e.GetDocument( fileName ).Types ) ).toEqual( [
					{
						Interface: c({
							Name: 'I',
							Extends: [ {
								GenericInstantiation: {
									Definition: 'J',
									Arguments: [c( { PrimitiveType: PrimitiveType.Number })]
								}
							} ]
						})
					},
					{
						Interface: c({
							Name: 'J',
							GenericParameters: [ { GenericParameter: { Name: 'S', Constraint: null } } ],
							Properties: [{ Name: 'Y', Type: { GenericParameter: c( { Name: 'S' }) } }]
						})
					}
				] );
			});

			it( "with parameters constrained by regular types", () => {
				file = "export interface I<T extends J> { X: T; } export interface J {}";
				expect( trimTypes( e.GetDocument( fileName ).Types ) ).toEqual( [
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

		it( "should ignore private properties on interfaces", () => {
			file = "export class I { X: string; private Y: number; }";
			var types = trimTypes( e.GetDocument( fileName ).Types );
			expect( types ).toEqual( [c( { Interface: c( { Name: 'I' } ) } )] );
			expect( types[0].Interface.Properties ).toEqual( [c( { Name: 'X' } ) ] );
		});

		it( "should interpret declarations from explicitly declared external modules as coming from their own files", () => {
			files['x.d.ts'] = "decalre module 'x' { export interface I { X: string; } }";
			file = "/// <reference path='x.d.ts' />\r\n import x = require('x'); export interface J { i: x.I; }";
			var types = e.GetDocument( fileName ).Types;
			expect( types.length ).toEqual( 1 );
			expect( types ).toEqual( [c( { Interface: c( { Name: 'J' }) })] );
			expect( types[0].Interface.Properties ).toEqual( [c( { Name: 'i' })] );
			expect( types[0].Interface.Properties[0].Type ).toEqual(
				c( { 
					Document: c( { Path: "x.d.ts" }),
					ExternalModule: '"x"',
					Interface: c({ Name: 'I' })
				})
				);
			expect( types[0].Interface.Properties[0].Type.InternalModule ).toBeFalsy();
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

		describe( "should extract comments", () => {
			it("on interfaces", () => {
				file = "/** A comment*/ export interface I {}";
				expect( trimTypes( e.GetDocument(fileName).Types, false ) ).toEqual( [
					{
						Comment: "A comment",
						Interface: c({ Name: "I" })
					}
				]);
			});

			it("on classes", () => {
				file = "/** A comment*/ export class C {}";
				expect( e.GetDocument(fileName).Classes ).toEqual( [
					c({ Comment: "A comment", Name: "C" })
				]);
			});

			it("on variables with constructor signatures", () => {
				file = "/** A comment*/ export var C: { new: () => string } = null";
				expect( e.GetDocument(fileName).Classes ).toEqual( [
					c({ Comment: "A comment", Name: "C" })
				]);
			});

			it("on properties", () => {
				file = "export interface I { /** A comment*/ X: string }";
				expect( trimTypes( e.GetDocument(fileName).Types, false )[0].Interface.Properties ).toEqual( [
					c({
						Comment: "A comment",
						Name: 'X'
					})
				]);
			});

			it("on methods", () => {
				file = "export interface I { /** Comment 1*/ X(): string; /** Comment 2*/ X( p: number ): number; }";
				var m = trimTypes( e.GetDocument(fileName).Types, false )[0].Interface.Methods[0];
				expect( m.Name ).toEqual( 'X' );
				expect( m.Signatures.sort( (a,b) => a.Parameters.length - b.Parameters.length ) ).toEqual( [
					c({ Comment: "Comment 1", Parameters: [] } ),
					c({ Comment: "Comment 2", Parameters: [ c({ Name: 'p' }) ] } )
				]);
			});
		});
	});

	/* Removes unnecessary back references for better readability of error messages */
	function trimTypes( types: Type[], trimComments: boolean = true ) {
		return types.map( x => trimType( x, trimComments ) );
	}

	/* Removes unnecessary back references for better readability of error messages */
	function trimType( type: Type, trimComments: boolean = true ): Type {
		if ( !type || !(<any>type).hasOwnProperty( 'Document' ) ) return type;
		delete type.Document;
		delete type.Kind;
		delete type.InternalModule;
		delete type.ExternalModule;
		if ( trimComments ) delete type.Comment;

		if ( type.Interface ) trimIntf( type.Interface, trimComments );
		if ( type.GenericParameter ) {
			trimType( type.GenericParameter.Constraint );
		}
		if ( type.GenericInstantiation ) {
			type.GenericInstantiation.Definition = <any>type.GenericInstantiation.Definition.Name;
			trimTypes( type.GenericInstantiation.Arguments );
		}
		if ( type.Array ) trimType( type.Array );

		return type;
	}

	function trimIntf( i: Interface, trimComments: boolean = true ) {
		trimTypes( i.GenericParameters );
		trimTypes( i.Extends );
		i.Properties.forEach( p => { 
			trimType( p.Type );
			if ( trimComments ) delete p.Comment;
		} );
		i.Methods.forEach( p => p.Signatures.forEach( s => {
			trimType( s.ReturnType );
			s.GenericParameters.forEach( t => trimType( t ) );
			s.Parameters.forEach( p => { 
				trimType( p.Type ); 
				if ( trimComments ) delete p.Comment;
			} );
		}) );
	}
}

var globalIndent = 0;

( <any>jasmine ).StringPrettyPrinter.prototype.append = function ( value: string ) {
	var prefixNewLine = false;
	var suffixNewLine = false;

	if ( value === '{ ' || value === '[ ' ) {
		globalIndent++;
		suffixNewLine = true;
	}
	else if ( value === ' }' || value === ' ]' ) {
		globalIndent--;
		prefixNewLine = true;
	}

	var prefix = prefixNewLine ? '\r\n' + new Array( globalIndent + 1 ).join( '\t' ) : '';
	var suffix = suffixNewLine ? '\r\n' + new Array( globalIndent + 1 ).join( '\t' ) : '';
	this.string += prefix + value + suffix;
};
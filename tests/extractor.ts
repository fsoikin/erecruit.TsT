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
			expect( e.GetModule( fileName ).Types ).toEqual( [{
				Module: jasmine.any(Object),
				Interface: jasmine.objectContaining({
					Name: 'X',
					Properties: [
						{ Name: 'A', Type: jasmine.objectContaining({ PrimitiveType: PrimitiveType.String }) },
						{ Name: 'B', Type: jasmine.objectContaining({ PrimitiveType: PrimitiveType.Number }) }
					]
				})
			}] );
		});

		it( "should correctly parse data structure with a substructure", () => {
			file = "export interface X { A: string; B: Y; } export interface Y { C: number; }";
			expect( e.GetModule( fileName ).Types ).toEqual( [
				{
					Module: jasmine.any( Object ),
					Interface: jasmine.objectContaining( {
						Name: 'X',
						Properties: [
							{ Name: 'A', Type: jasmine.objectContaining( { PrimitiveType: PrimitiveType.String }) },
							{ Name: 'B', Type: jasmine.objectContaining( { Interface: jasmine.objectContaining( { Name: 'Y' }) }) }
						]
					})
				},
				{
					Module: jasmine.any( Object ),
					Interface: jasmine.objectContaining( {
						Name: 'Y',
						Properties: [
							{ Name: 'C', Type: jasmine.objectContaining( { PrimitiveType: PrimitiveType.Number }) },
						]
					})
				}] );
		});

		it( "should correctly parse enums", () => {
			debugger;
			file = "export enum X { A, B, C }";
			expect( e.GetModule( fileName ).Types ).toEqual( [
				{
					Module: jasmine.any( Object ),
					Enum: jasmine.objectContaining( {
						Name: 'X',
						Values: [ { Name: 'A', Value: 0 }, { Name: 'B', Value: 1 }, { Name: 'C', Value: 2 } ]
					})
				}
			] );
		});

	});
}
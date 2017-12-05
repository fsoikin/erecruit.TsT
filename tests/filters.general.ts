/// <reference path="../typings/index.d.ts" />
import { markupFilters } from '../src/filters/general'
import * as i from '../src/interfaces'
import { group, renderTemplate } from './utils'

describe( "general filters", () => {

	group( "dirName", () => {
		it( " should return parent path for a regular input", () => {
			var cfg: any = { Host: <any>{ GetParentDirectory: ( path: string ) => "parent: " + path } };
			expect( renderTemplate( '{{"x/y/z" | dirName}}', {}, markupFilters( cfg ) ) )
				.toEqual( "parent: x/y/z" );
		});
	});

	group( "match", () => {
		it( " should evaluate the value against given regex", () => {
			expect( renderTemplate( '{{ "yes" if (x | match("a")) else "no" }}', { x: "abc" }, markupFilters(null) ) ).toEqual( "yes" );
		});
		it( " should respect the 'i' regex flag", () => {
			expect( renderTemplate( '{{ "yes" if (x | match("a","i")) else "no" }}', { x: "Abc" }, markupFilters( null )) ).toEqual( "yes" );
			expect( renderTemplate( '{{ "yes" if (x | match("a","")) else "no" }}', { x: "Abc" }, markupFilters( null )) ).toEqual( "no" );
		});
	});

	group( "regexReplace", () => {
		it( " should replace substrings that match given regex", () => {
			expect( renderTemplate( '{{ x | regexReplace("a", "x") }}', { x: "abc" }, markupFilters( null ) ) ).toEqual( "xbc" );
		});
		it( " should respect the 'g' regex flag", () => {
			expect( renderTemplate( '{{ x | regexReplace("a", "x", "g") }}', { x: "abca" }, markupFilters( null ) ) ).toEqual( "xbcx" );
			expect( renderTemplate( '{{ x | regexReplace("a", "x", "") }}', { x: "abca" }, markupFilters( null ) ) ).toEqual( "xbca" );
		});
		it( " should respect the 'i' regex flag", () => {
			expect( renderTemplate( '{{ x | regexReplace("a", "x", "i") }}', { x: "Abc" }, markupFilters( null ) ) ).toEqual( "xbc" );
			expect( renderTemplate( '{{ x | regexReplace("a", "x", "") }}', { x: "Abc" }, markupFilters( null ) ) ).toEqual( "Abc" );
		});
	});

	group( "fileNameWithoutExtension", () => {
		it( " should return the whole file name when GetParentDirectory returns a dot", () => {
			var cfg: any = { Host: <any>{ GetParentDirectory: ( path: string ) => "." } };
			expect( renderTemplate( '{{ "file.ext" | getFileNameWithoutExtension }}', {}, markupFilters( cfg ) ) )
				.toEqual( "file" );
		});

		it( " should return the whole file name when GetParentDirectory returns empty string", () => {
			var cfg: any = { Host: <any>{ GetParentDirectory: ( path: string ) => "" } };
			expect( renderTemplate( '{{ "file.ext" | getFileNameWithoutExtension }}', {}, markupFilters( cfg ) ) )
				.toEqual( "file" );
		});
	});
});

describe( " \"this\" helper", () => {
	it( "should return current context as value", () => {
		expect( renderTemplate( '{{ this.x }}', { x: "abc" }, {}) ).toEqual( "abc" );
		expect( renderTemplate( '{{ this.x | upper }}', { x: "abc" }, {}) ).toEqual( "ABC" );
	});
});
/// <reference path="../lib/jasmine/jasmine.d.ts" />
/// <reference path="../src/extractor.ts" />
/// <reference path="../src/interfaces.ts" />
/// <reference path="utils.ts" />
/// <reference path="extractor.types.ts" />
/// <reference path="extractor.classes.ts" />
/// <reference path="extractor.comments.ts" />
/// <reference path="extractor.generics.ts" />
/// <reference path="extractor.modules.ts" />

module erecruit.TsT.Tests.Extr {
	export var c = jasmine.objectContaining;

	export var e: Extractor;
	export var file: string;
	export var files: { [name: string]: string };
	export var fileName = "a.ts";

	describe( "Extractor", () => {

		beforeEach( () => {
			file = null;
			files = {};
			e = new Extractor( <CachedConfig>{
				Original: { RootDir: '.', ConfigDir: '.' },
				File: [{ Match: null, Types: null, Classes: null }],
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


		Extr.types();
		Extr.classes();
		Extr.modules();
		Extr.generics();
		Extr.comments();
		Extr.directives();
	});

	/* Removes unnecessary back references and unwraps lazy evaluators for better readability of error messages */
	export function trimAndUnwrapAll( types: Type[], trimComments: boolean = true ) {
		if ( !types ) return types;
		for ( var i = 0; i < types.length; i++ ) {
			types[i] = trimAndUnwrap( types[i], trimComments );
		}
		return types;
	}

	/* Removes unnecessary back references and unwraps lazy evaluators for better readability of error messages */
	export function trimAndUnwrapAllClasses( clss: Class[], trimComments: boolean = true ) {
		if ( !clss ) return clss;
		for ( var i = 0; i < clss.length; i++ ) {
			clss[i] = trimAndUnwrapClass( clss[i], trimComments );
		}
		return clss;
	}

	/* Removes unnecessary back references and unwraps lazy evaluators for better readability of error messages */
	export function trimAndUnwrapClass( cls: Class, trimComments: boolean = true ): Class {
		if ( !cls || !( <any>cls ).hasOwnProperty( 'Document' ) ) return cls;
		trimElement( cls, trimComments );
		trimAndUnwrapAll( cls.GenericParameters );
		trimAndUnwrapAll( cls.Implements );
		trimAndUnwrapAll( cls.GenericParameters );
		( cls.Constructors || [] ).forEach( s => trimAndUnwrapSignature( s, trimComments ) );
		return cls;
	}

	/* Removes unnecessary back references and unwraps lazy evaluators for better readability of error messages */
	export function trimAndUnwrap( type: Type, trimComments: boolean = true ): Type {
		if ( !type || !(<any>type).hasOwnProperty( 'Document' ) ) return type;
		trimElement( type, trimComments );

		if ( type.Interface ) type.Interface = <any>trimAndUnwrapIntf( type.Interface(), trimComments );
		if ( type.GenericParameter ) {
			type.GenericParameter = <any>type.GenericParameter();
			trimAndUnwrap( (<any>type.GenericParameter).Constraint, trimComments );
		}
		if ( type.GenericInstantiation ) {
			type.GenericInstantiation = <any>type.GenericInstantiation();
			(<any>type.GenericInstantiation).Definition = (<any>type.GenericInstantiation).Definition.Interface().Name;
			trimAndUnwrapAll( (<any>type.GenericInstantiation).Arguments, trimComments );
		}
		if ( type.Array ) type.Array = <any>trimAndUnwrap( type.Array(), trimComments );

		return type;
	}

	export function trimAndUnwrapIntf( i: Interface, trimComments: boolean = true ): Interface {
		trimAndUnwrapAll( i.GenericParameters, trimComments );
		trimAndUnwrapAll( i.Extends, trimComments );
		(i.Properties||[]).forEach( p => { 
			trimAndUnwrap( p.Type, trimComments );
			if ( trimComments ) deleteComment( p );
		} );
		(i.Methods||[]).forEach( p => p.Signatures.forEach( s => trimAndUnwrapSignature( s, trimComments ) ) );
		return i;
	}

	function trimAndUnwrapSignature( s: CallSignature, trimComments: boolean ) {
		trimAndUnwrap( s.ReturnType, trimComments );
		trimAndUnwrapAll( s.GenericParameters, trimComments );
		( s.Parameters || [] ).forEach( p => {
			trimAndUnwrap( p.Type, trimComments );
			if ( trimComments ) deleteComment( p );
		});
	}

	function deleteComment( x: any ) {
		delete x.Comment;
		delete x.Directives;
	}

	function trimElement( x: ModuleElement, trimComments: boolean ) {
		delete x.Document;
		delete x.Kind;
		delete x.InternalModule;
		delete x.ExternalModule;
		if ( trimComments ) deleteComment( x );
	}
}
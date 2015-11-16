/// <reference path="../lib/typescript/typescript.d.ts" />
/// <reference path="../lib/linq/linq.d.ts" />
/// <reference path="interfaces.ts" />
/// <reference path="utils.ts" />

type IEnumerable<T> = linqjs.IEnumerable<T>;
 
module erecruit.TsT {
	export interface ExtractorOptions {
		UseCaseSensitiveFileResolution?: boolean;
	}

	export interface Extractor {
		GetDocument( fileName: string ): Document;
	}

	export function createExtractor( config: CachedConfig, fileNames: string[], options: ExtractorOptions = {}) {

		let intrinsicsFileName = "87F58C4CD90A42FA86608E284696D4D3.ts";
		let intrinsicsFile = ts.ScriptSnapshot.fromString( getIntrinsicsText() );

		let allFileNames = ensureArray( config.Host.GetIncludedTypingFiles() ).concat( fileNames ).concat( [intrinsicsFileName] );
		let snapshots: { [fileName: string]: ts.IScriptSnapshot } = {};

		let langService = ts.createLanguageService( {
			getScriptFileNames: () => allFileNames,
      getScriptVersion: fileName => "",
			getScriptSnapshot,

			getCurrentDirectory: () => ".",
      getDefaultLibFileName: options => "",
      getCompilationSettings: () => ( {})
		});

		let program = langService.getProgram();
		let tc = program.getTypeChecker();
		let intrinsics = getIntrinsics();

		let typeCache: { [typeScriptTypeID: number]: Type } = {};
		let docCache: { [path: string]: Document } = {};

		return { GetDocument };

		function GetDocument( fileName: string ): Document {

			let mod = program.getSourceFile( fileName );
			if ( !mod ) return { Path: fileName, Classes: [], Types: [] };

			let allModuleDecls = Enumerable.from( mod.statements ).where( s => !!( s.flags & ts.NodeFlags.Export ) );
			let document = getCachedDoc( fileName );

			document.Classes = allModuleDecls.selectMany( classesFromDecl ).where( t => !!t ).distinct().toArray();
			document.Types = allModuleDecls.select( typeFromDecl ).where( t => !!t ).distinct().toArray();

			return document;
		}

		function getScriptSnapshot( fileName: string ) {
			if ( fileName == intrinsicsFileName ) return intrinsicsFile;

			let cached = snapshots[fileName];
			if ( cached !== undefined ) return cached;

			debug(() => "getScriptSnapshot: fetching: " + fileName );
			let content = config.Host.FetchFile( fileName );
			return snapshots[fileName] =
				content || content === "" ? ts.ScriptSnapshot.fromString( content ) : null;
		}

		function getCachedDoc( path: string ) {
			return docCache[path] || ( docCache[path] = { Path: path, Types: null, Classes: null });
		}

		function getCachedDocFromSymbol( symbol: ts.Symbol ) {
			if ( !symbol ) return null;

			let file = Enumerable
				.from( symbol.getDeclarations() )
				.selectMany( getAllParentsAndSelf )
				.where( d => d.kind == ts.SyntaxKind.SourceFile )
				.select( file => ( file as ts.SourceFile ).fileName )
				.firstOrDefault();

			return file && getCachedDoc( file );
		}

		function classesFromDecl( decl: ts.Statement ) {
			switch ( decl.kind ) {
				case ts.SyntaxKind.ClassDeclaration: return classesFromClassDecl( decl as ts.ClassDeclaration );
				case ts.SyntaxKind.VariableStatement: return classesFromVariable( decl as ts.VariableStatement );
			}
			return null;
		}
		
		function classesFromClassDecl( cl: ts.ClassDeclaration ) {
			return classesFromIdentifier( cl && cl.name );
		}

		function classesFromVariable( vr: ts.VariableStatement ) {
			let decls = vr && vr.declarationList.declarations;
			let name = decls && decls.map( d => d.name ).filter( n => !!n )[0];

			if ( name && name.kind == ts.SyntaxKind.Identifier )
				return classesFromIdentifier( <ts.Identifier> name );
			else
				return null;
		}

		function classesFromIdentifier( name: ts.Identifier ) {
			if ( !name || name.kind != ts.SyntaxKind.Identifier ) return null;

			let symbol = name && tc.getSymbolAtLocation( name );
			let type = symbol && tc.getTypeOfSymbolAtLocation( symbol, name );
			let comments = getComments( symbol );
			let firstDecl = getFirstDeclaration( symbol );
			let internalModule = getInternalModule( firstDecl );
			let externalModule = getExternalModule( firstDecl );

			return Enumerable
				.from( type && type.getConstructSignatures() )
				.groupBy( ctor => ctor.getReturnType(), ctor => ctor, ( classType, ctors ) => ( { classType, ctors }) )
				.select( x => <Class> {
						Name: name.getText(),
						Comment: comments,
						Directives: parseDirectives( comments ),
						Document: getCachedDocFromSymbol( symbol ),
						InternalModule: internalModule,
						ExternalModule: externalModule,
						Kind: ModuleElementKind.Class,
						PrimaryInterface: translateType( x.classType ),
						BaseClass: () => translateBaseClass( x.classType ),
						Implements: translateInterfacesOf( x.classType ).distinct().toArray(),

						GenericParameters: isGenericDefinition( x.classType )
							? getGenericTypeParameters( x.classType ).map( translateType )
							: null,

						Constructors: x.ctors.select( translateCallSignature ).toArray()
					});
		}

		type ClassOrIntfOrEnum = ts.ClassDeclaration | ts.InterfaceDeclaration | ts.EnumDeclaration;

		function typeFromDecl( decl: ts.Statement ) {
			switch ( decl.kind ) {
				case ts.SyntaxKind.ClassDeclaration: 
				case ts.SyntaxKind.InterfaceDeclaration:
				case ts.SyntaxKind.EnumDeclaration:
					return typeFromIdentifier( ( decl as ClassOrIntfOrEnum ).name );
			}
			return null;
		}

		function typeFromIdentifier( name: ts.Identifier ) {
			if ( !name || name.kind != ts.SyntaxKind.Identifier ) return null;
			let symbol = name && tc.getSymbolAtLocation( name );
			let type = symbol && tc.getDeclaredTypeOfSymbol( symbol );
			
			return translateType( type );
		}

		function translateType( type: ts.Type ) {
			if ( !type ) return null;

			let tid = getTypeId( type );
			let result = typeCache[tid];
			if ( result ) return result;

			debug(() => `Translating type '${getTypeName( type )} #${tid}'.` );
			let symbol = type.getSymbol();
			let firstDecl = getFirstDeclaration( symbol );
			let comments = getTypeComments( type );

			// This call will cause the typechecker to resolve properties, as well as a bunch of other information
			// about the type (such as generic constraints), but we don't actually need its result right now.
			type.getProperties(); 

			// First we calculate all non-recursive stuff in the type and put it into cache,
			// so that if we come across this same type while traversing the graph further,
			// we can peek this same instance from cache and not get caught in an infinite loop.
			typeCache[tid] = result = {
				Document: getCachedDocFromSymbol( symbol ),
				Kind: ModuleElementKind.Type,
				ExternalModule: getExternalModule( firstDecl ),
				InternalModule: getInternalModule( firstDecl ),
				Comment: comments,
				Directives: parseDirectives( comments ),
			};

			if ( isArrayType( type ) ) result.Array = memoize(() => translateType( getArrayElementType( type ) ) );
			else if ( isPrimitiveType( type ) ) result.PrimitiveType = translatePrimitiveType( type );
			else if ( isEnumType( type ) ) result.Enum = memoize(() => translateEnum( type ) );
			else if ( isTypeParameter( type ) ) result.GenericParameter = memoize(() => translateGenericParameter( type as ts.TypeParameter ) );
			else if ( isGenericInstantiation( type ) ) result.GenericInstantiation = memoize(() => translateGenericInstantiation( type as ts.TypeReference ) );
			else result.Interface = memoize( () => translateInterface( type ) );

			return result;
		}


		function translateEnum( type: ts.Type ): Enum {
			let symbol = type.getSymbol();
			let decl = symbol && symbol.valueDeclaration;
			let members = decl && decl.kind == ts.SyntaxKind.EnumDeclaration && ( decl as ts.EnumDeclaration ).members;
			if ( !members ) {
				debug( () => `Unable to resolve members of enum '${getTypeName( type )}'` );
				return null; 
			}

			return <Enum>{
				Name: decl.name.getText(),
				Values: members.map( m => ( { Name: m.name.getText(), Value: tc.getConstantValue( m ) }) )
			};
		}

		function translatePrimitiveType( type: ts.Type ): PrimitiveType {
			return type.flags & ts.TypeFlags.StringLike ? PrimitiveType.String :
				type.flags & ts.TypeFlags.Boolean ? PrimitiveType.Boolean :
				type.flags & ts.TypeFlags.Number ? PrimitiveType.Number
				: PrimitiveType.Any;
		}

		function translateCallSignature( s: ts.Signature ): CallSignature {
			var typeParams = s.getTypeParameters();
			var sigComments = getComments( s );
			return {
				GenericParameters: typeParams && typeParams.length ? typeParams.map( translateType ) : null,
				Parameters: s.getParameters().map( p => {
					var comments = getComments( p );
					return <Identifier>{
						Name: p.name, Type: translateType( tc.getTypeOfSymbolAtLocation( p, p.valueDeclaration ) ),
						Comment: comments, Directives: parseDirectives( comments )
					};
				}),
				ReturnType: translateType( s.getReturnType() ),
				Comment: sigComments,
				Directives: parseDirectives( sigComments )
			};
		}

		function translateInterface( type: ts.Type ): Interface {
			let intf = type as ts.InterfaceTypeWithDeclaredMembers;
			let members = Enumerable.from( intf.declaredProperties ).where( isPublicProperty );
			
			return {
				Name: getTypeName( intf ),
				Extends: translateInterfacesOf( type ).toArray(),
				GenericParameters: getGenericTypeParameters( intf ).map( translateType ),

				Properties: members
					.where( p => !!( p.flags & ts.SymbolFlags.Property ) )
					.select( p => {
						var comments = getComments( p );
						return {
							Name: p.name,
							Type: translateType( tc.getTypeOfSymbolAtLocation( p, p.valueDeclaration ) ),
							Comment: comments,
							Directives: parseDirectives( comments )
						};
					})
					.toArray(),

				Methods: members
					.where( m => !!( m.flags & ts.SymbolFlags.Method ) )
					.groupBy( m => m.name, m => m, ( name, ms ) => <Method>{
						Name: name,
						Signatures: ms
							.selectMany( m => Enumerable
								.from( tc.getTypeOfSymbolAtLocation( m, m.valueDeclaration ).getCallSignatures() )
								.select( translateCallSignature ) )
							.toArray(),
					})
					.toArray(),
			};
		}

		function translateGenericParameter( type: ts.TypeParameter ): GenericParameter {

			debug(() => `Translating generic parameter ${getTypeName( type )} #${getTypeId( type )} with constraint ${getTypeName( type.constraint )} #${getTypeId( type.constraint )}.` );
			return {
				Name: getTypeName( type ),
				Constraint: !type.constraint || isEmptyGenericConstraint( type.constraint ) ? null : translateType( type.constraint )
			};
		}

		function translateGenericInstantiation( type: ts.TypeReference ): GenericInstantiation {
			return {
				Definition: translateType( type.target ),
				Arguments: ( type.typeArguments || [] ).map( translateType )
			};
		}

		function translateBaseClass( type: ts.Type ): Class {
			return Enumerable
				.from( type.getBaseTypes() )
				.where( t => !!( t.flags & ts.TypeFlags.Class ) )
				.selectMany( t => classesFromClassDecl( t.symbol.valueDeclaration as ts.ClassDeclaration ) ) // TODO: this won't handle class expression
				.firstOrDefault();
		}

		/** Given a type, returns interfaces that the type implements (but no classes that it extends!) */
		function translateInterfacesOf( type: ts.Type ): IEnumerable<Type> {

			// The language service doesn't have a way to just get all implemented interfaces from a type,
			// so we have to go through the symbol and its heritage classes to tease out the interfaces.
			let symbol = type && type.getSymbol();
			return Enumerable
				.from( symbol && symbol.getDeclarations() ) // Traverse all declarations of this type.
				.cast<ts.ClassLikeDeclaration | ts.InterfaceDeclaration>()
				.selectMany( decl => decl && decl.heritageClauses ) // For every declaration, pull heritage clauses.
				.selectMany( clause => clause.types ) // From every clause, take list of syntax nodes representing types.
				.select( tc.getTypeAtLocation )  // From every syntax node, get the logical Type.
				.where( t => t && !( t.flags & ts.TypeFlags.Class ) ) // Only take interfaces, not classes.
				.select( translateType );
		}

		function getInternalModule( decl: ts.Declaration ) {
			return getAllParentsAndSelf( decl )
				.where( d => d.kind === ts.SyntaxKind.ModuleDeclaration )
				.select( d => ( d as ts.ModuleDeclaration ).name )
				.where( n => n.kind === ts.SyntaxKind.Identifier )
				.select( n => n.getText() )
				.toArray()
				.join(".");
		}

		function getExternalModule( decl: ts.Declaration ) {
			let explicitModuleName = getAllParentsAndSelf( decl )
				.where( p => p.kind === ts.SyntaxKind.ModuleDeclaration )
				.select( d => ( d as ts.ModuleDeclaration ).name )
				.where( n => n && n.kind === ts.SyntaxKind.StringLiteral )
				.select( n => n.getText() )
				.firstOrDefault();

			let sourceFile = decl && decl.getSourceFile();
			let sourceFileName = sourceFile && ( sourceFile.moduleName || `"${sourceFile.fileName}"` );

			return explicitModuleName || sourceFileName;
		}

		function getAllParentsAndSelf( n: ts.Node ) {
			return Enumerable.unfold( n, n => n.parent ).takeWhile( n => !!n );
		}

		function isPublicProperty( m: ts.Symbol ) {
			return m && m.valueDeclaration && !( m.valueDeclaration.flags & ( ts.NodeFlags.Private | ts.NodeFlags.Protected ) );
		}

		function getTypeId( t: ts.Type ): number { return t && ( t as any ).id; } // HACK

		function getTypeName( t: ts.Type ): string {
			let symbol = t && t.getSymbol();
			let name = symbol && symbol.name;
			return name || "<unknown>";
		};

		function isAny( t: ts.Type ): boolean { return !!( t.flags & ts.TypeFlags.Any ); }
		function isEmptyGenericConstraint( t: ts.Type ): boolean { return t == intrinsics.emptyGenericConstraintType; }
		function isAnonymous( t: ts.Type ): boolean { return !!( t.flags & ts.TypeFlags.Anonymous ); }

		function getFirstDeclaration( s: ts.Symbol ) {
			return s && ( s.getDeclarations() || [] )[0];
		}

		function getTypeComments( t: ts.Type ) {
			return getComments( t.getSymbol() );
		}

		function getComments( obj: { getDocumentationComment(): ts.SymbolDisplayPart[] } ) {
			return ( ( obj && obj.getDocumentationComment() ) || [] ).map( d => d.text ).join('\r\n');
		}

		function isArrayType( t: ts.Type ) {
			return ( t.flags & ts.TypeFlags.Reference ) && ( t as ts.GenericType ).target == intrinsics.arrayType;
		}

		function getArrayElementType( t: ts.Type ) {
			if ( !( t.flags & ts.TypeFlags.Reference ) ) return intrinsics.anyType;

			let g = t as ts.GenericType;
			if ( g.target != intrinsics.arrayType ) return intrinsics.anyType;

			return g.typeArguments[0];
		}

		function isPrimitiveType( t: ts.Type ): boolean {
			return !!( t.flags & ( ts.TypeFlags.StringLike | ts.TypeFlags.Number | ts.TypeFlags.Boolean | ts.TypeFlags.Boolean ) );
		}

		function isEnumType( t: ts.Type ): boolean {
			return !!( t.flags & ts.TypeFlags.Enum );
		}

		function isInterfaceType( t: ts.Type ): boolean {
			return !!( t.flags & ts.TypeFlags.Interface );
		}

		function isTypeParameter( t: ts.Type ): boolean {
			return !!( t.flags & ts.TypeFlags.TypeParameter );
		}

		function isGenericInstantiation( t: ts.Type ) {
			return ( t.flags & ts.TypeFlags.Reference ) && ( t as ts.TypeReference ).target !== t;
		}

		function isGenericDefinition( t: ts.Type ) {
			return ( t.flags & ts.TypeFlags.Reference ) && ( t as ts.TypeReference ).target === t;
		}

		function getGenericTypeParameters( t: ts.Type ) {
			if ( t.flags & ( ts.TypeFlags.Class | ts.TypeFlags.Interface ) ) {
				return ( t as ts.InterfaceType ).typeParameters || [];
			}
			else {
				return [];
			}
		}

		function getIntrinsicsText() {
			return "\
				var array: number[];\
				var _any: any;\
				var empty: {};\
			";
		}

		function getIntrinsics() {
			let file = program.getSourceFile( intrinsicsFileName );
			let varTypes = file.statements
				.filter( s => s.kind == ts.SyntaxKind.VariableStatement )
				.map( s => ( s as ts.VariableStatement ).declarationList.declarations[0].type )
				.map( tc.getTypeAtLocation )
				.filter( t => !!t );

			return {
				arrayType: ( varTypes[0] as ts.GenericType ).target,
				emptyGenericConstraintType: ( ( varTypes[0] as ts.GenericType ).target.typeArguments[0] as ts.TypeParameter ).constraint,
				anyType: varTypes[1],
				emptyType: varTypes[2],
			};
		}
	}

	function memoize<T>( f: () => T ): () => T {
		var result: T;
		var evaluated = false;
		return () => evaluated ? result : ( evaluated = true, result = f() );
	}

	/** Regex used to parse "directives" out of comments. */
	var directiveRegex = /[\r\n]{0,1}\s*@([^\s]+)\s+([^\s]{0,1}[^\r\n]*)/g;

	/** Given the "documentation comments" string, parses out "directives", which have the form of @Dir Value.
	  * The result is a dictionary of the form ["Dir"] = "Value". */
	function parseDirectives( comments: string ): { [name: string]: string } {
		if ( !comments ) return {};

		var result: { [name: string]: string } = {};
		directiveRegex.lastIndex = 0;
		do {
			var m = directiveRegex.exec( comments );
			if ( m && m[1] ) {
				result[m[1]] = (m[2]||"").trim();
			}
		} while ( m );

		return result;
	}
}
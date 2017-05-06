import * as Enumerable from 'linq-es2015'
import * as ts from 'typescript'
import * as i from './interfaces'
import { CachedConfig } from './config'
import { linq, empty, log, debug } from './utils'

type IEnumerable<T> = Enumerable.Enumerable<T>

export interface ExtractorOptions {
	UseCaseSensitiveFileResolution?: boolean;
}

export interface Extractor {
	GetDocument( fileName: string ): i.Document;
}

export function createExtractor( config: CachedConfig, fileNames: string[], options: ExtractorOptions = {}) : Extractor {

	let intrinsicsFileName = "87F58C4CD90A42FA86608E284696D4D3.ts";
	let intrinsicsFile = ts.ScriptSnapshot.fromString( getIntrinsicsText() );

	let allFileNames = ( config.Host.GetIncludedTypingFiles() || [] ).concat( fileNames ).concat( [intrinsicsFileName] );
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

	let typeCache: { [typeScriptTypeID: number]: i.Type } = {};
	let docCache: { [path: string]: i.Document } = {};

	return { GetDocument };

	function GetDocument( fileName: string ): i.Document {

		debug(() => `GetDocument: ${fileName}` );

		let mod = program.getSourceFile( fileName );
		let document = getCachedDoc(fileName);
		if (!mod) {
			debug(() => `Language Service doesn't know '${fileName}', returning empty document.`);
			document.Classes = [];
			document.Types = [];
			return document;
		}

		let exports = linq( getModulesOfFile( mod ) ).SelectMany( mod => tc.getExportsOfModule( mod ) || [] ).ToArray();
		if (!document.Classes) {
			document.Classes = linq(exports).SelectMany(classesFromSymbol).Where(t => !!t).Distinct().ToArray();
		}
		if (!document.Types) {
			document.Types = linq(exports).Select(typeFromSymbol).Where(t => !!t).Distinct().ToArray();
		}

		debug(() => `Document '${fileName}': ${document.Classes.length} classes, ${document.Types.length} types.` );
		return document;
	}

	function* getModulesOfFile( file: ts.SourceFile ) {
		yield* moduleAndSubmodulesOfNode( file );

		function* moduleAndSubmodulesOfNode( module: ts.Node ) {
			// See if the node itself is a module.
			yield* yieldModule( tc.getSymbolAtLocation( module ) );

			// See if the node is a declaration, has a name, and that name is a module.
			let name = (module as ts.DeclarationStatement).name;
			yield* yieldModule( name && tc.getSymbolAtLocation( name ) );

			if ( module.kind == ts.SyntaxKind.SourceFile ) {
				// If it's a source file, recursively look at all statements in it.
				yield* modulesFromStatements( (module as ts.SourceFile).statements );
			}
			else if ( module.kind === ts.SyntaxKind.ModuleBlock ) {
				// If it's a module block, recursively look at all statements in it.
				yield* modulesFromStatements( (module as ts.ModuleBlock).statements );
			}
			else if ( module.kind === ts.SyntaxKind.ModuleDeclaration ) {
				// If it's a module declaration, recursively look at its body.
				yield* moduleAndSubmodulesOfNode( (module as ts.ModuleDeclaration).body );
			}
		}

		function* yieldModule( maybeModule: ts.Symbol ) {
			if ( maybeModule && ( maybeModule.getFlags() & ts.SymbolFlags.Module ) ) yield maybeModule;
		}

		function* modulesFromStatements( statements: Iterable<ts.Statement> ) {
			for( const st of statements || [] ) yield* moduleAndSubmodulesOfNode( st );
		}
	}

	function getScriptSnapshot( fileName: string ) {
		if ( fileName === intrinsicsFileName ) return intrinsicsFile;

		let cached = snapshots[fileName];
		if ( cached !== undefined ) return cached;

		debug(() => `getScriptSnapshot: fetching: ${fileName}` );
		let content = config.Host.FetchFile(fileName);
		if (!content) debug(() => `getScriptSnapshot: couldn't fetch ${fileName}`);

		return snapshots[fileName] =
			content || content === "" ? ts.ScriptSnapshot.fromString( content ) : null;
	}

	function getCachedDoc( path: string ) {
		return docCache[path] || (docCache[path] = { Path: makeRelativeToRoot(path), Types: null, Classes: null });
	}

	function getCachedDocFromSymbol( symbol: ts.Symbol ) {
		if ( !symbol ) return null;

		let file = 
			linq( symbol.getDeclarations() )
			.SelectMany( getAllParentsAndSelf )
			.Where( d => d.kind === ts.SyntaxKind.SourceFile )
			.Select( file => ( file as ts.SourceFile ).fileName )
			.FirstOrDefault();

		return file && getCachedDoc( file );
	}

	type ClassOrVariableDecl = ts.ClassDeclaration | ts.VariableDeclaration;

	function classesFromSymbol( s: ts.Symbol ) {
		if ( !s ) return empty<i.Class>();

		if ( s.flags & ( ts.SymbolFlags.Class | ts.SymbolFlags.Variable ) ) {
			let decl = s.declarations[0] as ClassOrVariableDecl;
			let name = decl && decl.name;

			if ( name && name.kind === ts.SyntaxKind.Identifier )
				return classesFromIdentifier( s, name );
		}

		return empty<i.Class>();
	}

	function classesFromIdentifier( symbol: ts.Symbol, name: ts.Identifier ) {
		if ( !symbol || !name || name.kind != ts.SyntaxKind.Identifier ) return empty<i.Class>();

		let type = symbol && tc.getTypeOfSymbolAtLocation( symbol, name );
		let firstDecl = getFirstDeclaration( symbol );
		let internalModule = getInternalModule( firstDecl );
		let externalModule = getExternalModule( firstDecl );

		return linq( 
			type && type.getConstructSignatures() )
			.GroupBy( ctor => ctor.getReturnType(), ctor => ctor, ( classType, ctors ) => ( { classType, ctors }) )
			.Select( x => <i.Class> {
				Name: name.getText(),
				Comment: getComments( symbol ),
				Directives: getDirectives( firstDecl ),
				Document: getCachedDocFromSymbol( symbol ),
				InternalModule: internalModule,
				ExternalModule: externalModule,
				Kind: i.ModuleElementKind.Class,
				PrimaryInterface: translateType( x.classType ),
				BaseClass: () => translateBaseClass( x.classType ),
				Implements: translateInterfacesOf( x.classType ).Distinct().ToArray(),

				GenericParameters: isGenericDefinition( x.classType )
					? getGenericTypeParameters( x.classType ).map( translateType )
					: null,

				Constructors: linq(x.ctors).Select( translateCallSignature ).ToArray()
			});
	}

	type ClassOrIntfOrEnum = ts.ClassDeclaration | ts.InterfaceDeclaration | ts.EnumDeclaration;

	function typeFromSymbol( s: ts.Symbol ) {
		if ( !s ) return null;

		switch ( s.flags ) {
			case ts.SymbolFlags.Class: 
			case ts.SymbolFlags.Interface:
			case ts.SymbolFlags.RegularEnum:
				return translateType( tc.getDeclaredTypeOfSymbol( s ) );
		}

		return null;
	}

	function translateType( type: ts.Type ) {
		if ( !type ) return null;

		let tid = getTypeId( type );
		let result = typeCache[tid];
		if ( result ) return result;

		debug(() => `Translating type '${getTypeName( type )} #${tid}'.` );
		let symbol = type.getSymbol();
		let firstDecl = getFirstDeclaration( symbol );

		// This call will cause the typechecker to resolve properties, as well as a bunch of other information
		// about the type (such as generic constraints), but we don't actually need its result right now.
		type.getProperties(); 

		// First we calculate all non-recursive stuff in the type and put it into cache,
		// so that if we come across this same type while traversing the graph further,
		// we can peek this same instance from cache and not get caught in an infinite loop.
		typeCache[tid] = result = {
			Document: getCachedDocFromSymbol( symbol ),
			Kind: i.ModuleElementKind.Type,
			ExternalModule: getExternalModule( firstDecl ),
			InternalModule: getInternalModule( firstDecl ),
			Comment: getTypeComments( type ),
			Directives: getDirectives( firstDecl ),
		};

		if ( isArrayType( type ) ) result.Array = memoize(() => translateType( getArrayElementType( type ) ) );
		else if ( isPrimitiveType( type ) ) result.PrimitiveType = translatePrimitiveType( type );
		else if ( isEnumType( type ) ) result.Enum = memoize(() => translateEnum( type ) );
		else if ( isTypeParameter( type ) ) result.GenericParameter = memoize(() => translateGenericParameter( type as ts.TypeParameter ) );
		else if ( isGenericInstantiation( type ) ) result.GenericInstantiation = memoize(() => translateGenericInstantiation( type as ts.TypeReference ) );
		else result.Interface = memoize( () => translateInterface( type ) );

		return result;
	}


	function translateEnum( type: ts.Type ): i.Enum {
		let symbol = type.getSymbol();
		let decl = symbol && symbol.valueDeclaration;
		let members = decl && decl.kind === ts.SyntaxKind.EnumDeclaration && ( decl as ts.EnumDeclaration ).members;
		if ( !members ) {
			debug( () => `Unable to resolve members of enum '${getTypeName( type )}'` );
			return null; 
		}

		return <i.Enum>{
			Name: decl.name.getText(),
			Values: members.map( m => ( { Name: m.name.getText(), Value: tc.getConstantValue( m ) }) )
		};
	}

	function translatePrimitiveType( type: ts.Type ): i.PrimitiveType {
		return type.flags & ts.TypeFlags.StringLike ? i.PrimitiveType.String :
			type.flags & ts.TypeFlags.Boolean ? i.PrimitiveType.Boolean :
			type.flags & ts.TypeFlags.Number ? i.PrimitiveType.Number
			: i.PrimitiveType.Any;
	}

	function translateCallSignature( s: ts.Signature ): i.CallSignature {
		var typeParams = s.getTypeParameters();
		return {
			GenericParameters: typeParams && typeParams.length ? typeParams.map( translateType ) : null,
			Parameters: s.getParameters().map( p => {
				return <i.Identifier>{
					Name: p.name, Type: translateType( tc.getTypeOfSymbolAtLocation( p, p.valueDeclaration ) ),
					Comment: getComments( p ),
					Directives: getDirectives( p.valueDeclaration )
				};
			}),
			ReturnType: translateType( s.getReturnType() ),
			Comment: getComments( s ),
			Directives: getDirectives( s.declaration )
		};
	}

	function translateInterface( type: ts.Type ): i.Interface {
		let intf = type as ts.InterfaceTypeWithDeclaredMembers;

		// For some reason, for anonymous types declaredProperties is always empty,
		// but for named interfaces getProperties() flattens inheritance hierarchy,
		// so we have to have this fork here.
		let members = isAnonymous( type ) ? intf.getProperties() : intf.declaredProperties;
		let publicMembers = linq( members ).Where( isPublicProperty );
		
		return {
			Name: getTypeName( intf ),
			Extends: translateInterfacesOf( type ).ToArray(),
			GenericParameters: getGenericTypeParameters( intf ).map( translateType ),

			Properties: publicMembers
				.Where( p => !!( p.flags & ts.SymbolFlags.Property ) )
				.Select( p => ({
					Name: p.name,
					Type: translateType( tc.getTypeOfSymbolAtLocation( p, p.valueDeclaration ) ),
					Comment: getComments( p ),
					Directives: getDirectives( p.valueDeclaration )
				}))
				.ToArray(),

			Methods: publicMembers
				.Where( m => !!( m.flags & ts.SymbolFlags.Method ) )
				.GroupBy( m => m.name, m => m, ( name, ms ) => <i.Method>{
					Name: name,
					Signatures: linq(ms).SelectMany( callSignaturesOfMethod ).Select( translateCallSignature ).ToArray()
				})
				.ToArray(),
		};
	}

	function callSignaturesOfMethod( method: ts.Symbol ) {
		let t = method && method.valueDeclaration && tc.getTypeOfSymbolAtLocation( method, method.valueDeclaration );
		let signatures = t && t.getCallSignatures();
		return signatures || [];
	}

	function translateGenericParameter( type: ts.TypeParameter ): i.GenericParameter {

		debug(() => `Translating generic parameter ${getTypeName( type )} #${getTypeId( type )} with constraint ${getTypeName( type.constraint )} #${getTypeId( type.constraint )}.` );
		return {
			Name: getTypeName( type ),
			Constraint: !type.constraint || isEmptyGenericConstraint( type.constraint ) ? null : translateType( type.constraint )
		};
	}

	function translateGenericInstantiation( type: ts.TypeReference ): i.GenericInstantiation {
		return {
			Definition: translateType( type.target ),
			Arguments: 
				( type.typeArguments || [] )
				.filter( t => !(<any>t).isThisType ) // TS compiler gives every class a "this" type, which is not a real generic parameter, but it makes this flag "internal" for some reason
				.map( translateType )
		};
	}

	function translateBaseClass( type: ts.Type ): i.Class {
		return linq( 
			type.getBaseTypes() )
			.Cast<ts.ObjectType>()
			.Where( t => hasObjectFlag( t, ts.ObjectFlags.Class ) )
			.SelectMany( t => classesFromSymbol( t.symbol ) ) // TODO: this won't handle class expression
			.FirstOrDefault();
	}

	/** Given a type, returns interfaces that the type implements (but no classes that it extends!) */
	function translateInterfacesOf( type: ts.Type ): IEnumerable<i.Type> {

		// The language service doesn't have a way to just get all implemented interfaces from a type,
		// so we have to go through the symbol and its heritage classes to tease out the interfaces.
		let symbol = type && type.getSymbol();
		return linq( 
			symbol && symbol.getDeclarations() ) // Traverse all declarations of this type.
			.Cast<ts.ClassLikeDeclaration | ts.InterfaceDeclaration>()
			.SelectMany( decl => (decl && decl.heritageClauses) || empty<ts.HeritageClause>() ) // For every declaration, pull heritage clauses.
			.SelectMany( clause => clause.types || empty<ts.ExpressionWithTypeArguments>() ) // From every clause, take list of syntax nodes representing types.
			.Select( tc.getTypeAtLocation )  // From every syntax node, get the logical Type.
			.Where( t => t && !isClass( t ) ) // Only take interfaces, not classes.
			.Select( translateType );
	}

	// If the given type is an ObjectType, returns its objectFlags, otherwise returns undefined.
	function objectFlags( t: ts.Type ) {
		if ( !t ) return undefined;
		if ( t.flags & ts.TypeFlags.Object ) return (t as ts.ObjectType).objectFlags; else return undefined;
	}

	function hasObjectFlag( t: ts.Type, f: ts.ObjectFlags ) { return !!( objectFlags(t) & f ); }

	function isClass( t: ts.Type ): boolean {

		if ( hasObjectFlag( t, ts.ObjectFlags.Class ) ) return true;

		if ( hasObjectFlag( t, ts.ObjectFlags.Reference ) ) {
			// When target === t, it means that the type is a _generic definition_ (as opposed to "generic instantiation"),
			// in which case it must be not a class: if it was, it would have been caught by the previous 'if'.
			let target = ( t as ts.TypeReference ).target;
			return target !== t && isClass( target );
		}

		return false;
	}

	function getInternalModule( decl: ts.Declaration ) {
		return getAllParentsAndSelf( decl )
			.Where( d => d.kind === ts.SyntaxKind.ModuleDeclaration )
			.Select( d => ( d as ts.ModuleDeclaration ).name )
			.Where( n => n.kind === ts.SyntaxKind.Identifier )
			.Select( n => n.getText() )
			.Reverse()
			.ToArray()
			.join(".");
	}

	function getExternalModule( decl: ts.Declaration ) {
		let explicitModuleName = getAllParentsAndSelf( decl )
			.Where( p => p.kind === ts.SyntaxKind.ModuleDeclaration )
			.Select( d => ( d as ts.ModuleDeclaration ).name )
			.Where( n => n && n.kind === ts.SyntaxKind.StringLiteral )
			.Select( n => n.getText() )
			.FirstOrDefault();

		let sourceFile = decl && decl.getSourceFile();
		let sourceFileName = sourceFile && (sourceFile.moduleName || `"${makeRelativeToRoot(sourceFile.fileName)}"` );

		return explicitModuleName || sourceFileName;
	}

	function getAllParentsAndSelf( n: ts.Node ) {
		function* unfold() { while(n) { yield n; n = n.parent; } }
		return linq( unfold() ).TakeWhile( n => !!n );
	}

	function isPublicProperty( prop: ts.Symbol ) {
		if ( !prop || !prop.valueDeclaration ) return false;
		return !( ts.getCombinedModifierFlags(prop.valueDeclaration) & ( ts.ModifierFlags.Private | ts.ModifierFlags.Protected ) );
	}

	function getTypeId( t: ts.Type ): number { return t && ( t as any ).id; } // HACK

	function getTypeName( t: ts.Type ): string {
		if ( hasObjectFlag( t, ts.ObjectFlags.Anonymous ) ) return null;

		let symbol = t && t.getSymbol();
		let name = symbol && symbol.name;
		return name || "<unknown>";
	};

	function isAny( t: ts.Type ): boolean { return !!( t.flags & ts.TypeFlags.Any ); }
	function isEmptyGenericConstraint( t: ts.Type ): boolean { return t === intrinsics.emptyGenericConstraintType; }
	function isAnonymous( t: ts.Type ): boolean { return hasObjectFlag( t, ts.ObjectFlags.Anonymous ); }

	function getFirstDeclaration( s: ts.Symbol ) {
		return s && ( s.getDeclarations() || [] )[0];
	}

	function getTypeComments( t: ts.Type ) {
		return getComments( t.getSymbol() );
	}

	function getComments( obj: { getDocumentationComment(): ts.SymbolDisplayPart[] } ) {
		return ( ( obj && obj.getDocumentationComment() ) || [] ).map( d => d.text ).join('\r\n');
	}

	function getDirectives( node: ts.Node ) : { [key:string]: string } {
		if ( !node ) return {};

		let jsDoc: (ts.JSDoc | ts.JSDocTag)[] = (<any>node).jsDocCache || [];
		return linq( jsDoc )
			.SelectMany( d => (d.kind === ts.SyntaxKind.JSDocTag ? [d] : (<ts.JSDoc>d).tags) || empty<ts.JSDocTag>() )
			.ToArray()
			.reduce( (hash, tag) => { 
				if ( tag.tagName && tag.tagName.text ) hash[tag.tagName.text.trim()] = (tag.comment || "").trim();
				return hash; 
			}, <{ [key:string]: string }>{} );
	}

	function isArrayType( t: ts.Type ) {
		return hasObjectFlag( t, ts.ObjectFlags.Reference ) && (t as ts.GenericType).target === intrinsics.arrayType;
	}

	function getArrayElementType( t: ts.Type ) {
		if ( !hasObjectFlag( t, ts.ObjectFlags.Reference ) ) return intrinsics.anyType;

		let g = t as ts.GenericType;
		if ( g.target !== intrinsics.arrayType ) return intrinsics.anyType;

		return g.typeArguments[0];
	}

	function isPrimitiveType( t: ts.Type ): boolean {
		return !!( t.flags & ( ts.TypeFlags.StringLike | ts.TypeFlags.Number | ts.TypeFlags.Boolean | ts.TypeFlags.Any ) );
	}

	function isEnumType( t: ts.Type ): boolean { return !!( t.flags & ts.TypeFlags.Enum ); }
	function isInterfaceType( t: ts.ObjectType ): boolean { return hasObjectFlag( t, ts.ObjectFlags.Interface ); }
	function isTypeParameter( t: ts.Type ): boolean { return !!( t.flags & ts.TypeFlags.TypeParameter ); }

	function isGenericInstantiation( t: ts.Type ) {
		return hasObjectFlag( t, ts.ObjectFlags.Reference ) && ( t as ts.TypeReference ).target !== t;
	}

	function isGenericDefinition( t: ts.Type ) {
		return hasObjectFlag( t, ts.ObjectFlags.Reference ) && ( t as ts.TypeReference ).target === t;
	}

	function getGenericTypeParameters( t: ts.Type ) {
		if ( hasObjectFlag( t, ts.ObjectFlags.Class | ts.ObjectFlags.Interface ) ) {
			return ( t as ts.InterfaceType ).typeParameters || [];
		}
		else {
			return [];
		}
	}

	function getIntrinsicsText() {
		return "\
			var _1: string[];\
			var _2: any;\
			var _3: {};\
		";
	}

	function getIntrinsics() {
		let file = program.getSourceFile( intrinsicsFileName );
		let varTypes = file.statements
			.filter( s => s.kind === ts.SyntaxKind.VariableStatement )
			.map( s => ( s as ts.VariableStatement ).declarationList.declarations[0].type )
			.map( tc.getTypeAtLocation )
			.filter( t => !!t );

		let arrayType = ( varTypes[0] as ts.GenericType ).target;
		if ( arrayType ) tc.getApparentType(arrayType.typeArguments[0]); // This call forces TS to resolve type constraints.

		return {
			arrayType: arrayType,
			emptyGenericConstraintType: arrayType && ( arrayType.typeArguments[0] as ts.TypeParameter ).constraint,
			anyType: varTypes[1],
			emptyType: varTypes[2],
		};
	}

	function makeRelativeToRoot(path: string) {
		return config.Host.MakeRelativePath(config.Original.RootDir, path);
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
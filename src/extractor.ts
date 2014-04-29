/// <reference path="../lib/typescript/typescript.d.ts" />
/// <reference path="../lib/linq/linq.d.ts" />
/// <reference path="interfaces.ts" />
/// <reference path="utils.ts" />

import ts = TypeScript;
import PEKind = ts.PullElementKind;
import IEnumerable = linqjs.IEnumerable;
 
module erecruit.TsT {
	export interface ExtractorOptions {
		UseCaseSensitiveFileResolution?: boolean;
	}

	export class Extractor {
		constructor( private _config: CachedConfig, private _options: ExtractorOptions = {}) {
			ensureArray( _config.Host.GetIncludedTypingFiles() ).forEach( f => this.addFile( f ) );
		}

		private addFile( f: string ) {
			log( () => "addFile: " + f );
			var snapshot = this._tsHost.getScriptSnapshot( f );
			if ( snapshot ) this._compiler.addFile( f, snapshot, null, 0, false, [] );
			return !!snapshot;
		}

		GetDocument( fileName: string ): Document {
			fileName = this.normalizePath( fileName ); // Have to normalize file path to avoid duplicates
			log( () => "GetDocument: " + fileName );

			if ( !this._compiler.getDocument( fileName ) ) {
				if ( !this.addFile( fileName ) ) {
					throw "Cannot read file " + fileName;
				}

				var resolved = ts.ReferenceResolver.resolve( [fileName], this._tsHost, this._options.UseCaseSensitiveFileResolution );
				Enumerable.from( resolved && resolved.resolvedFiles )
					.where( f => !this._compiler.getDocument( f.path ) )
					.forEach( f => this.addFile( f.path ) );
			}

			var mod = this._compiler.topLevelDeclaration( fileName );
			if ( !mod ) return { Path: fileName, Classes: [], Types: [] };

			var allModuleDecls = Enumerable
				.from( mod.getChildDecls() )
				.where( d => d.kind === PEKind.DynamicModule || d.kind === PEKind.Container )
				.selectMany( mod => mod.getChildDecls() );

			function flatten( ds: IEnumerable<ts.PullDecl> ): IEnumerable<ts.PullDecl> {
				return ds.where( d => d.kind !== PEKind.Container ).concat(
					ds.where( d => d.kind === PEKind.Container )
						.selectMany( d => flatten( Enumerable.from( d.getChildDecls() ) ) ) );
			}
			allModuleDecls = flatten( allModuleDecls );

			var result = this.GetCachedDoc( fileName );

			result.Classes = allModuleDecls
				.where( d => d.kind == PEKind.Variable )
				.select( d => {
					var variable = this._compiler.getSymbolOfDeclaration( d );
					this.EnsureResolved( variable );
					var varType = variable.isType() && ( <ts.PullTypeSymbol>variable );
					var sigs = variable.type.getConstructSignatures();
					//var ctor = variable.type.getConstructorMethod();
					//if ( ctor ) sigs = sigs.concat( ctor.type.getConstructSignatures() );

					return <Class> {
						Name: d.name,
						Comment: variable.docComments() || (varType && varType.docComments()),
						Document: result,
						InternalModule: this.GetInternalModule( d ),
						ExternalModule: this.GetExternalModule( d ),
						Kind: ModuleElementKind.Class,
						Implements: varType && this.GetBaseTypes( varType ),
						GenericParameters: varType ? memoize( () => varType.getTypeParameters().map( x => this.GetType( x ) ) ) : null,
						Constructors: memoize( () => sigs.map( x => this.GetCallSignature( x ) ) )
					};
				})
				.where( c => c.Constructors.length > 0 )
				.toArray();

			result.Types = allModuleDecls
				.where( d => d.kind == PEKind.Interface || d.kind == PEKind.Enum || d.kind == PEKind.Class )
				.select( d => this._compiler.getSymbolOfDeclaration( d ) )
				.doAction( this.EnsureResolved )
				.select( x => this.GetType( <ts.PullTypeSymbol>x ) )
				.toArray();

			log( () => "GetDocument: result: " + result.Classes.length + " classes, " + result.Types.length + " types." );
			debug( () => "GetDocument: classes: " + result.Classes.map( c => c.Name ).join() );
			debug( () => "GetDocument: types: " + result.Types.map( t => typeName( t ) ).join() );

			return result;
		}

		private GetCachedDoc( path: string ) {
			return this._docCache[path] || ( this._docCache[path] = { Path: path, Types: null, Classes: null });
		}

		private GetCachedDocFromDecl( d: ts.PullDecl ) {
			return this.GetCachedDoc( ( d && d.getParentPath()[0].name ) || "" );
		}

		private GetCachedDocFromSymbol( s: ts.PullSymbol ) {
			return this.GetCachedDocFromDecl( s && s.getDeclarations()[0] );
		}

		private GetInternalModule( d: ts.PullDecl ) {
			return d && Enumerable.from( d.getParentPath() )
				.where( p => p.kind == PEKind.Container )
				.select( p => p.name )
				.toArray()
				.join(".");
		}

		private GetExternalModule( d: ts.PullDecl ) {
			return d && Enumerable.from( d.getParentPath() )
				.where( p => p.kind == PEKind.DynamicModule )
				.select( p => p.name )
				.firstOrDefault();
		}

		private GetType( type: ts.PullTypeSymbol ) {
			if ( !type ) return null;
			var cached = this._typeCache[type.pullSymbolID];
			if ( cached ) return cached;

			this._typeCache[type.pullSymbolID] = cached = {
				Document: this.GetCachedDocFromSymbol( type ),
				Kind: ModuleElementKind.Type,
				ExternalModule: this.GetExternalModule( type.getDeclarations()[0] ),
				InternalModule: this.GetInternalModule( type.getDeclarations()[0] ),
				Comment: type.docComments()
			};

			this.EnsureResolved( type );
			if ( type.getElementType() ) cached.Array = memoize( () => this.GetType( type.getElementType() ) );
			else if ( type.isPrimitive() ) cached.PrimitiveType = this.GetPrimitiveType( type );
			else if ( type.isEnum() ) cached.Enum = memoize( () => this.GetEnum( type ) );
			else if ( type.isTypeParameter() ) cached.GenericParameter = memoize( () => this.GetGenericParameter( type ) );
			else if ( this.IsGenericInstantiation( type ) ) {
				var refType = <ts.PullTypeReferenceSymbol>type;
				// Sometimes, for some reason, nested arrays don't receive an 'element type',
				// but instead are parsed as a generic instantiation of Array<T>
				if ( refType.referencedTypeSymbol.name === "Array" && refType.getTypeParameters().length === 1 ) {
					cached.Array = memoize( () => this.GetType( refType.getTypeArguments()[0] ) );
				}
				else {
					cached.GenericInstantiation = memoize( () => this.GetGenericInstantiation( refType ) );
				}
			}
			else cached.Interface = memoize( () => this.GetInterface( type ) );

			debug( () => "GetType: pullSymbolID=" + type.pullSymbolID + ", result = " + typeName( cached ) );
			return cached;
		}

		private IsGenericInstantiation( type: ts.PullTypeSymbol ) {
			return ( <ts.PullTypeReferenceSymbol> type ).referencedTypeSymbol && type.getTypeParameters() && type.getTypeParameters().length;
		}

		private GetGenericInstantiation( type: ts.PullTypeReferenceSymbol ): GenericInstantiation {
			return {
				Definition: this.GetType( type.referencedTypeSymbol ),
				Arguments: type.referencedTypeSymbol.getTypeParameters()
					.map( p => this.GetType( type.getTypeParameterArgumentMap()[p.pullSymbolID] ) )
			};
		}

		private GetCallSignature( s: ts.PullSignatureSymbol ) {
			this.EnsureResolved( s );
			return {
				GenericParameters: s.getTypeParameters().length ? s.getTypeParameters().map( t => this.GetType( t.type ) ) : null,
				Parameters: s.parameters.map( p => <Identifier>{ Name: p.name, Type: this.GetType( p.type ), Comment: p.docComments() }),
				ReturnType: this.GetType( s.returnType ),
				Comment: s.docComments()
			};
		}

		private GetPrimitiveType( type: ts.PullTypeSymbol ): PrimitiveType {
			return type.name === "string" ? PrimitiveType.String :
				type.name === "boolean" ? PrimitiveType.Boolean :
				type.name === "number" ? PrimitiveType.Number
				: PrimitiveType.Any;
		}

		private GetBaseTypes( type: ts.PullTypeSymbol ) {
			return memoize( () => Enumerable
				.from( type.getExtendedTypes() )
				.concat( type.getImplementedTypes() )
				.select( x => this.GetType( x ) )
				.where( t => !!t.Interface || !!t.GenericInstantiation )
				.toArray() );
		}

		private GetInterface( type: ts.PullTypeSymbol ) {
			return {
				Name: type.name,
				Extends: this.GetBaseTypes( type ),
				GenericParameters: Enumerable.from( type.getTypeParameters() ).select( t => this.GetType( t ) ).toArray(),
				Properties: type.getMembers()
					.filter( m => m.isProperty() && m.isExternallyVisible() )
					.map( m => {
						this.EnsureResolved( m );
						debug( () => "Property: " + type.name + "." + m.name );
						return <Identifier>{ Name: m.name, Type: this.GetType( m.type ), Comment: m.docComments() };
					}),
				Methods: Enumerable.from( type.getMembers() )
					.where( m => m.isMethod() && m.isExternallyVisible() )
					.groupBy( m => m.name, m => m, ( name, ms ) => <Method>{
						Name: name,
						Signatures: ms.selectMany( m =>
							{
								this.EnsureResolved( m );
								return Enumerable.from( m.type.getCallSignatures() ).select( s => this.GetCallSignature( s ) );
							}).toArray(),
					})
					.toArray(),
			};
		}

		private GetEnum( type: ts.PullTypeSymbol ): Enum {
			var doc = this.GetDocumentForDecl( type.getDeclarations()[0] );
			var values: { [name: string]: number } = {};
			Enumerable.from( type.getDeclarations() )
				.selectMany( d => d.getChildDecls() )
				.where( d => d.kind == PEKind.EnumMember )
				.forEach( decl => {
					var value: any = ( <ts.PullEnumElementDecl>decl ).constantValue;
					if ( typeof value !== "number" ) {
						var expr = doc && <ts.EnumElement>doc._getASTForDecl( decl );
						var eval = expr && expr.equalsValueClause && evalExpr( expr.equalsValueClause.value );
						if ( eval ) value = eval.errorMessage || eval.result;
					}
					values[decl.name] = value;
				});

			return <Enum>{
				Name: type.name,
				Values: Enumerable.from( values ).select( ( x ) => ( { Name: x.key, Value: x.value }) ).toArray()
			};

			function evalExpr( e: ts.AST ): { errorMessage?: string; result?: number } {
				if ( e.kind() == ts.SyntaxKind.IdentifierName ) {
					return { result: values[( <ts.Identifier>e ).text()] };
				}

				if ( e instanceof ts.BinaryExpression ) {
					var b = <ts.BinaryExpression>e;
					var bop = binaryOp( e.kind() );
					var left = evalExpr( b.left );
					var right = evalExpr( b.right );
					if ( left.errorMessage ) return left;
					if ( !bop ) return err();
					if ( right.errorMessage ) return right;
					return { result: bop( left.result, right.result ) };
				}

				if ( e instanceof ts.PrefixUnaryExpression ) {
					var uop = unaryOp( e.kind() );
					var arg = evalExpr( ( <ts.PrefixUnaryExpression>e ).operand );
					if ( !uop ) return err();
					if ( arg.errorMessage ) return arg;
					return { result: uop( arg.result ) };
				}

				function err() {
					return { errorMessage: ts.SyntaxKind[e.kind()] + " is not supported." };
				}
			}
		}

		private GetDocumentForDecl( d: ts.PullDecl ): ts.Document {
			var script = d && d.getParentPath()[0];
			var fileName = script && script.kind == PEKind.Script && ( <ts.RootPullDecl>script ).fileName();
			return fileName && this._compiler.getDocument( fileName );
		}

		private GetGenericParameter( type: ts.PullTypeSymbol ): GenericParameter {
			var g = <ts.PullTypeParameterSymbol> type;
			return { Name: type.name, Constraint: this.GetType( g.getConstraint() ) };
		}

		private EnsureResolved( s: ts.PullSymbol ) {
			var decls: any[] = ( <any>s )._declarations; // HACK: the _declarations property is not exposed as public, but _getResolver fails with an assert when called while _declarations is null or empty
			if ( decls && decls.length ) s._resolveDeclaredSymbol();
		}

		private _compiler = new ts.TypeScriptCompiler();
		private _typeCache: { [pullSymbolId: number]: Type } = {};
		private _docCache: { [path: string]: Document } = {};
		private _snapshots: { [fileName: string]: ts.IScriptSnapshot } = {};

		private normalizePath( path: string ): string {
			return (path||"").replace( /\\/g, '/' );
		}

		private _tsHost: ts.IReferenceResolverHost = {
			getScriptSnapshot: fileName => {
				fileName = this.realPath( fileName );
				var cached = this._snapshots[fileName];
				if ( cached !== undefined ) return cached;

				debug( () => "getScriptSnapshot: fetching: " + fileName );
				var content = this._config.Host.FetchFile( fileName );
				return this._snapshots[fileName] =
					content || content === "" ? ts.ScriptSnapshot.fromString( content ) : null;
			},
			resolveRelativePath: ( path, directory ) => this.rootRelPath( this._config.Host.ResolveRelativePath( path, this.realPath( directory ) ) ),
			fileExists: path => !!this._tsHost.getScriptSnapshot( path ),
			directoryExists: path => this._config.Host.DirectoryExists( this.realPath( path ) ),
			getParentDirectory: path => {
				debug( () => "getParentDirectory: " + path );
				var result = this._config.Host.GetParentDirectory( this.realPath( path ) );
				return result ? this.rootRelPath( result ) : result;
			}
		};

		private rootRelPath( realPath: string ) {
			return this._config.Host.MakeRelativePath( this._config.Original.RootDir, realPath );
		}

		private realPath( pathRelativeToRoot: string ) {
			return this._config.Host.ResolveRelativePath( pathRelativeToRoot, this._config.Original.RootDir );
		}
	}

	function binaryOp( op: ts.SyntaxKind ): (x: number, y: number) => number {
		switch ( op ) {
			case ts.SyntaxKind.BitwiseOrExpression: return ( x, y ) => x | y;
			case ts.SyntaxKind.BitwiseAndExpression: return ( x, y ) => x & y;
			case ts.SyntaxKind.BitwiseExclusiveOrExpression: return ( x, y ) => x ^ y;
			case ts.SyntaxKind.AddExpression: return ( x, y ) => x + y;
			case ts.SyntaxKind.SubtractExpression: return ( x, y ) => x - y;
			case ts.SyntaxKind.LeftShiftExpression: return ( x, y ) => x << y;
			case ts.SyntaxKind.UnsignedRightShiftExpression:
			case ts.SyntaxKind.SignedRightShiftExpression: return ( x, y ) => x >> y;
		}
	}

	function unaryOp( op: ts.SyntaxKind ): ( x: number ) => number {
		switch ( op ) {
			case ts.SyntaxKind.BitwiseNotExpression: return x => ~x;
			case ts.SyntaxKind.NegateExpression: return x => -x;
		}
	}

	function memoize<T>( f: () => T ): () => T {
		var result: T;
		var evaluated = false;
		return () => evaluated ? result : ( evaluated = true, result = f() );
	}
}
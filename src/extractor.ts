/// <reference path="../lib/typescript/typescript.d.ts" />
/// <reference path="../lib/linq/linq.d.ts" />
/// <reference path="interfaces.ts" />
/// <reference path="utils.ts" />

module erecruit.TsT {
	export interface ExtractorOptions {
		UseCaseSensitiveFileResolution?: boolean;
	}

	export class Extractor {
		constructor( private _config: CachedConfig, private _options: ExtractorOptions = {}) {
			ensureArray( _config.Host.GetIncludedTypingFiles() ).forEach( f => this.addFile( f ) );
		}

		private addFile( f: string ) { this._compiler.addFile( f, this._tsHost.getScriptSnapshot( f ), null, 0, false, [] ); }

		GetModule( fileName: string ): Module {
			fileName = this.normalizePath( fileName ); // Have to normalize file path to avoid duplicates

			if ( !this._compiler.getDocument( fileName ) ) {
				this.addFile( fileName );

				var resolved = TypeScript.ReferenceResolver.resolve( [fileName], this._tsHost, this._options.UseCaseSensitiveFileResolution );
				Enumerable.from( resolved && resolved.resolvedFiles )
					.where( f => !this._compiler.getDocument( f.path ) )
					.forEach( f => this.addFile( f.path ) );
			}

			var mod = this._compiler.topLevelDeclaration( fileName );
			if ( !mod ) return { Path: fileName, Classes: [], Types: [] };

			var allModuleDecls = Enumerable
				.from( mod.getChildDecls() )
				.where( d => d.kind === TypeScript.PullElementKind.DynamicModule || d.kind === TypeScript.PullElementKind.Container )
				.selectMany( mod => mod.getChildDecls() );

			function flatten( ds: linqjs.IEnumerable<TypeScript.PullDecl> ): linqjs.IEnumerable<TypeScript.PullDecl> {
				return ds.where( d => d.kind !== TypeScript.PullElementKind.Container ).concat(
					ds.where( d => d.kind === TypeScript.PullElementKind.Container )
						.selectMany( d => flatten( Enumerable.from( d.getChildDecls() ) ) ) );
			}
			allModuleDecls = flatten( allModuleDecls );

			var result: Module = { Path: fileName, Classes: null, Types: null };

			result.Classes = allModuleDecls
				.where( d => d.kind == TypeScript.PullElementKind.Variable )
				.select( d => {
					var variable = this._compiler.getSymbolOfDeclaration( d );
					this.EnsureResolved( variable );
					var varType = variable.isType() && ( <TypeScript.PullTypeSymbol>variable );
					var sigs = variable.type.getConstructSignatures();
					var ctor = variable.type.getConstructorMethod();
					if ( ctor ) sigs = sigs.concat( ctor.type.getConstructSignatures() );

					return <Class> {
						Name: d.name,
						Module: result,
						InternalModule: this.GetInternalModule( d ),
						Kind: ModuleElementKind.Class,
						Implements: varType && this.GetBaseTypes( result )( varType ),
						GenericParameters: varType && varType.getTypeParameters().map( this.GetType( result ) ),
						Constructors: sigs.map( this.GetCallSignature( result ) )
					};
				})
				.where( c => c.Constructors.length > 0 )
				.toArray();

			result.Types = allModuleDecls
				.where( d => d.kind == TypeScript.PullElementKind.Interface || d.kind == TypeScript.PullElementKind.Enum || d.kind == TypeScript.PullElementKind.Class )
				.select( d => this._compiler.getSymbolOfDeclaration( d ) )
				.doAction( this.EnsureResolved )
				.select( this.GetType( result ) )
				.toArray();

			return result;
		}

		private GetInternalModule( d: TypeScript.PullDecl ) {
			return d && Enumerable.from( d.getParentPath() )
				.where( p => p.kind == TypeScript.PullElementKind.Container )
				.select( p => p.name )
				.toArray()
				.join(".");
		}

		private GetType = ( mod: Module ) => ( type: TypeScript.PullTypeSymbol ) => {
			if ( !type ) return null;
			var cached = this._typeCache[type.pullSymbolID];
			if ( cached ) return cached;

			this._typeCache[type.pullSymbolID] = cached = {
				Module: mod,
				Kind: ModuleElementKind.Type,
				InternalModule: this.GetInternalModule( type.getDeclarations()[0] )
			};

			this.EnsureResolved( type );
			if ( type.getElementType() ) cached.Array = this.GetType( mod )( type.getElementType() )
			else if ( type.isPrimitive() ) cached.PrimitiveType = this.GetPrimitiveType( type );
			else if ( type.isEnum() ) cached.Enum = this.GetEnum( type );
			else if ( type.isTypeParameter() ) cached.GenericParameter = this.GetGenericParameter( mod, type );
			else if ( this.IsGenericInstantiation( type ) ) cached.GenericInstantiation = this.GetGenericInstantiation( mod, <TypeScript.PullTypeReferenceSymbol>type );
			else cached.Interface = this.GetInterface( mod )( type );

			return cached;
		};

		private IsGenericInstantiation( type: TypeScript.PullTypeSymbol ) {
			return ( <TypeScript.PullTypeReferenceSymbol> type ).referencedTypeSymbol && type.getTypeParameters() && type.getTypeParameters().length;
		}

		private GetGenericInstantiation( mod: Module, type: TypeScript.PullTypeReferenceSymbol ): GenericInstantiation {
			var t = this.GetType( mod );
			var def = t( type.referencedTypeSymbol );
			if ( !def.Interface ) return null; // TODO: this should be an error condition

			return {
				Definition: def.Interface,
				Arguments: type.referencedTypeSymbol.getTypeParameters()
					.map( p => t( type.getTypeParameterArgumentMap()[p.pullSymbolID] ) )
			};
		}

		private GetCallSignature = ( mod: Module ) => ( s: TypeScript.PullSignatureSymbol ) => {
			this.EnsureResolved( s );
			return {
				GenericParameters: s.getTypeParameters().map( t => this.GetType( mod )( t.type ) ),
				Parameters: s.parameters.map( p => <Identifier>{ Name: p.name, Type: this.GetType( mod )( p.type ) }),
				ReturnType: this.GetType(mod)( s.returnType )
			};
		};

		private GetPrimitiveType( type: TypeScript.PullTypeSymbol ): PrimitiveType {
			return type.name === "string" ? PrimitiveType.String :
				type.name === "boolean" ? PrimitiveType.Boolean :
				type.name === "number" ? PrimitiveType.Number
				: PrimitiveType.Any;
		}

		private GetBaseTypes = ( mod: Module ) => ( type: TypeScript.PullTypeSymbol ) =>
			Enumerable
				.from( type.getExtendedTypes() )
				.concat( type.getImplementedTypes() )
				.select( this.GetType( mod ) )
				.where( t => !!t.Interface || !!t.GenericInstantiation )
				.toArray();

		private GetInterface = ( mod: Module ) => ( type: TypeScript.PullTypeSymbol ) => ( {
			Name: type.name,
			Extends: this.GetBaseTypes( mod )( type ),
			GenericParameters: Enumerable.from( type.getTypeParameters() ).select( this.GetType( mod ) ).toArray(),
			Properties: type.getMembers().filter( m => m.isProperty() && m.isExternallyVisible() ).map( m => {
				this.EnsureResolved( m );
				return <Identifier>{ Name: m.name, Type: this.GetType( mod )( m.type ) };
			}),
			Methods: Enumerable.from( type.getMembers() )
				.where( m => m.isMethod() && m.isExternallyVisible() )
				.groupBy( m => m.name, m => m, ( name, ms ) => <Method>{
					Name: name,
					Signatures: ms.selectMany( m => {
						this.EnsureResolved( m );
						return Enumerable.from( m.type.getCallSignatures() ).select( this.GetCallSignature( mod ) );
					}).toArray(),
				})
				.toArray(),
		});

		private GetEnum( type: TypeScript.PullTypeSymbol ): Enum {
			var doc = this.GetDocumentForDecl( type.getDeclarations()[0] );
			var values: { [name: string]: number } = {};
			Enumerable.from( type.getDeclarations() )
				.selectMany( d => d.getChildDecls() )
				.where( d => d.kind == TypeScript.PullElementKind.EnumMember )
				.forEach( decl => {
					var value: any = ( <TypeScript.PullEnumElementDecl>decl ).constantValue;
					if ( typeof value !== "number" ) {
						var expr = doc && <TypeScript.EnumElement>doc._getASTForDecl( decl );
						var eval = expr && expr.equalsValueClause && evalExpr( expr.equalsValueClause.value );
						if ( eval ) value = eval.errorMessage || eval.result;
					}
					values[decl.name] = value;
				});

			return <Enum>{
				Name: type.name,
				Values: Enumerable.from( values ).select( ( x ) => ( { Name: x.key, Value: x.value }) ).toArray()
			};

			function evalExpr( e: TypeScript.AST ): { errorMessage?: string; result?: number } {
				if ( e.kind() == TypeScript.SyntaxKind.IdentifierName ) {
					return { result: values[( <TypeScript.Identifier>e ).text()] };
				}

				if ( e instanceof TypeScript.BinaryExpression ) {
					var b = <TypeScript.BinaryExpression>e;
					var bop = binaryOp( e.kind() );
					var left = evalExpr( b.left );
					var right = evalExpr( b.right );
					if ( left.errorMessage ) return left;
					if ( !bop ) return err();
					if ( right.errorMessage ) return right;
					return { result: bop( left.result, right.result ) };
				}

				if ( e instanceof TypeScript.PrefixUnaryExpression ) {
					var uop = unaryOp( e.kind() );
					var arg = evalExpr( ( <TypeScript.PrefixUnaryExpression>e ).operand );
					if ( !uop ) return err();
					if ( arg.errorMessage ) return arg;
					return { result: uop( arg.result ) };
				}

				function err() {
					return { errorMessage: TypeScript.SyntaxKind[e.kind()] + " is not supported." };
				}
			}
		}

		private GetDocumentForDecl( d: TypeScript.PullDecl ): TypeScript.Document {
			var script = d && d.getParentPath()[0];
			var fileName = script && script.kind == TypeScript.PullElementKind.Script && ( <TypeScript.RootPullDecl>script ).fileName();
			return fileName && this._compiler.getDocument( fileName );
		}

		private GetGenericParameter( mod: Module, type: TypeScript.PullTypeSymbol ): GenericParameter {
			var g = <TypeScript.PullTypeParameterSymbol> type;
			return { Name: type.name, Constraint: this.GetType( mod )( g.getConstraint() ) };
		}

		private EnsureResolved( s: TypeScript.PullSymbol ) {
			var decls: any[] = ( <any>s )._declarations; // HACK: the _declarations property is not exposed as public, but _getResolver fails with an assert when called while _declarations is null or empty
			if ( decls && decls.length ) s._resolveDeclaredSymbol();
		}

		private _compiler = new TypeScript.TypeScriptCompiler();
		private _typeCache: { [pullSymbolId: number]: Type } = {};
		private _snapshots: { [fileName: string]: TypeScript.IScriptSnapshot } = {};

		private normalizePath( path: string ): string {
			return this._config.Host
				.MakeRelativePath( '.', path )
				.replace( /\\/g, '/' );
		}

		private _tsHost: TypeScript.IReferenceResolverHost = {
			getScriptSnapshot: fileName => {
				return this._snapshots[fileName] || ( this._snapshots[fileName] = ( () => {
					var content = this._config.Host.FetchFile( fileName );
					return content ? TypeScript.ScriptSnapshot.fromString( content ) : null;
				})() );
			},
			resolveRelativePath: ( path, directory ) => this.normalizePath( this._config.Host.ResolveRelativePath( path, directory ) ),
			fileExists: path => !!this._tsHost.getScriptSnapshot( path ),
			directoryExists: path => this._config.Host.DirectoryExists( path ),
			getParentDirectory: path => this._config.Host.GetParentDirectory( path )
		};
	}

	function binaryOp( op: TypeScript.SyntaxKind ): (x: number, y: number) => number {
		switch ( op ) {
			case TypeScript.SyntaxKind.BitwiseOrExpression: return ( x, y ) => x | y;
			case TypeScript.SyntaxKind.BitwiseAndExpression: return ( x, y ) => x & y;
			case TypeScript.SyntaxKind.BitwiseExclusiveOrExpression: return ( x, y ) => x ^ y;
			case TypeScript.SyntaxKind.AddExpression: return ( x, y ) => x + y;
			case TypeScript.SyntaxKind.SubtractExpression: return ( x, y ) => x - y;
			case TypeScript.SyntaxKind.LeftShiftExpression: return ( x, y ) => x << y;
			case TypeScript.SyntaxKind.UnsignedRightShiftExpression:
			case TypeScript.SyntaxKind.SignedRightShiftExpression: return ( x, y ) => x >> y;
		}
	}

	function unaryOp( op: TypeScript.SyntaxKind ): ( x: number ) => number {
		switch ( op ) {
			case TypeScript.SyntaxKind.BitwiseNotExpression: return x => ~x;
			case TypeScript.SyntaxKind.NegateExpression: return x => -x;
		}
	}
}
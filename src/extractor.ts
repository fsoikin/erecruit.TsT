/// <reference path="../lib/typescript/typescript.d.ts" />
/// <reference path="../lib/linq/linq.d.ts" />
/// <reference path="interfaces.ts" />

module erecruit.TsT {
	export interface ExtractorOptions {
		UseCaseSensitiveFileResolution?: boolean;
	}

	export class Extractor {
		constructor( private _host: ITsTHost, private _options: ExtractorOptions = {}) { }

		GetModule( fileName: string ): Module {
			fileName = fileName.replace( /\\/g, '/' );

			if ( !this._compiler.getDocument( fileName ) ) {
				var addFile = ( f: string ) => this._compiler.addFile( f, this._tsHost.getScriptSnapshot( f ), null, 0, false, [] );
				addFile( fileName );

				var resolved = TypeScript.ReferenceResolver.resolve( [fileName], this._tsHost, this._options.UseCaseSensitiveFileResolution );
				Enumerable.from( resolved && resolved.resolvedFiles )
					.where( f => !this._compiler.getDocument( f.path ) )
					.forEach( f => addFile( f.path ) );
			}

			var mod = this._compiler.topLevelDeclaration( fileName );
			if ( !mod ) return { Path: fileName, Classes: [], Types: [] };

			var allModuleDecls = Enumerable
				.from( mod.getChildDecls() )
				.where( d => d.kind == TypeScript.PullElementKind.DynamicModule )
				.selectMany( mod => mod.getChildDecls() );

			var result: Module = { Path: fileName, Classes: null, Types: null };

			result.Classes = allModuleDecls
				.where( d => d.kind == TypeScript.PullElementKind.Variable )
				.select( d => {
					var variable = this._compiler.getSymbolOfDeclaration( d );
					this.EnsureResolved( variable );
					var varType = variable.isType() && ( <TypeScript.PullTypeSymbol>variable );
					var sigs = variable.type.getConstructSignatures()
			var ctor = variable.type.getConstructorMethod();
					if ( ctor ) sigs = sigs.concat( ctor.type.getConstructSignatures() );

					return <Class> {
						Name: d.name,
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

		private GetType = ( mod: Module ) => ( type: TypeScript.PullTypeSymbol ) => {
			if ( !type ) return null;
			var cached = this._typeCache[type.pullSymbolID];
			if ( cached ) return cached;

			this._typeCache[type.pullSymbolID] = cached = { Module: mod };

			this.EnsureResolved( type );
			if ( type.getElementType() ) cached.Array = this.GetType( mod )( type.getElementType() )
		else if ( type.isPrimitive() ) cached.PrimitiveType = this.GetPrimitiveType( type );
			else if ( type.isEnum() ) cached.Enum = this.GetEnum( type );
			else if ( type.isTypeParameter() ) cached.GenericParameter = this.GetGenericParameter( mod, type );
			else cached.Interface = this.GetInterface( mod )( type );

			return cached;
		};

		private GetCallSignature = ( mod: Module ) => ( s: TypeScript.PullSignatureSymbol ) => {
			this.EnsureResolved( s );
			return {
				GenericParameters: s.getTypeParameters().map( t => this.GetType( mod )( t.type ) ),
				Parameters: s.parameters.map( p => <Identifier>{ Name: p.name, Type: this.GetType( mod )( p.type ) })
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
				.concat( type.isClass() ? [type] : [] )
				.select( this.GetType( mod ) )
				.where( t => !!t.Interface )
				.toArray();

		private GetInterface = ( mod: Module ) => ( type: TypeScript.PullTypeSymbol ) => ( {
			Name: type.name,
			Extends: this.GetBaseTypes( mod )( type ),
			GenericParameters: Enumerable.from( type.getTypeParameters() ).select( this.GetType( mod ) ).toArray(),
			Properties: type.getMembers().filter( m => m.isProperty() ).map( m => {
				this.EnsureResolved( m );
				return <Identifier>{ Name: m.name, Type: this.GetType( mod )( m.type ) };
			}),
			Methods: Enumerable.from( type.getMembers() )
				.where( m => m.isMethod() )
				.groupBy( m => m.name, m => m, ( name, ms ) => <Method>{
					Name: name,
					Signatures: ms.selectMany( m => {
						this.EnsureResolved( m );
						return m.type.getCallSignatures().map( this.GetCallSignature( mod ) );
					}).toArray()
				})
				.toArray(),
		});

		private GetEnum( type: TypeScript.PullTypeSymbol ): Enum {
			return <Enum>{
				Name: type.name,
				Values: type.getMembers().map( ( m ) => ( { Name: m.name, Value: ( <TypeScript.PullEnumElementDecl>m.getDeclarations()[0] ).constantValue }) )
			};
		}

		private GetMethod = ( mod: Module ) => ( type: TypeScript.PullTypeSymbol ) => ( {
			Name: type.name,
			Signatures: type.getCallSignatures().map( this.GetCallSignature( mod ) )
		});

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
		private _snapshots: { [fileName: number]: TypeScript.IScriptSnapshot } = {};

		private _tsHost: TypeScript.IReferenceResolverHost = {
			getScriptSnapshot: fileName => {
				return this._snapshots[fileName] || ( this._snapshots[fileName] = ( () => {
					var content = this._host.FetchFile( fileName );
					return content ? TypeScript.ScriptSnapshot.fromString( content ) : null;
				})() );
			},
			resolveRelativePath: ( path, directory ) => this._host.ResolveRelativePath( path, directory ),
			fileExists: path => !!this._tsHost.getScriptSnapshot( path ),
			directoryExists: path => this._host.DirectoryExists( path ),
			getParentDirectory: path => this._host.GetParentDirectory( path )
		};
	}
}
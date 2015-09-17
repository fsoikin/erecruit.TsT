/// <reference path="../../lib/linq/linq.d.ts" />
/// <reference path="../interfaces.ts" />
/// <reference path="../emitter.ts" />
/// <reference path="../config.ts" />
/// <reference path="../utils.ts" />

module erecruit.TsT.CSharp {
	export function markupFilters( config: CachedConfig ): { [key: string]: Function } {
		return {
			cs_typeName: typeName,
			cs_typeNamespace: typeNamespace,
			cs_typeFullName: ( e: ModuleElement ) => typeName( e, true ),
			cs_isEmptyNamespace: ( e: ModuleElement ) => typeNamespace( e ) ? <any>e : false
		};

		function typeName( e: ModuleElement, includeNamespace?: boolean ): string {
			if ( !e ) return "";

			var type = e.Kind === ModuleElementKind.Type ? <Type>e : null;
			var cls = e.Kind === ModuleElementKind.Class ? <Class>e : null;
			if ( type && type.Array ) return typeName( type.Array(), includeNamespace ) + "[]";
			if ( type && type.PrimitiveType ) return primitiveTypeMap[type.PrimitiveType] || "object";

			var n = TsT.objName( e );
			if ( !n ) return "object";
			if ( type && type.GenericParameter ) return n;

			var ns = typeNamespace( e );
			if ( ns ) ns += '.';

			return ( includeNamespace ? ns : "" ) + n;
		}

		function typeNamespace( e: ModuleElement ) {
			if ( !e || !e.Document || !e.Document.Path ) return "";

			var realPath = config.Host.ResolveRelativePath( e.Document.Path, config.Original.RootDir );
			var directory = config.Host.GetParentDirectory( realPath );
			var directoryRelativeToRoot = config.Host.MakeRelativePath( config.Original.RootDir, directory );

			log( () => "C#: typeNamespace: " + e.Document.Path + " --> " + directoryRelativeToRoot );

			if ( !directoryRelativeToRoot || directoryRelativeToRoot === '.' ) return "";
			if ( directoryRelativeToRoot[0] === '.' && directoryRelativeToRoot[1] === '.' ) return "";
			return directoryRelativeToRoot
				.replace( /[\.\-\+]/g, '_' )
				.replace( /[\/\\]/g, '.' );
		}
	}

	var primitiveTypeMap: { [key: number]: string } = <any>Enumerable.from( [
		{ t: PrimitiveType.Any, n: "object" },
		{ t: PrimitiveType.String, n: "string" },
		{ t: PrimitiveType.Boolean, n: "bool" },
		{ t: PrimitiveType.Number, n: "int" }
	] )
		.toObject( x => x.t, x => x.n );
}
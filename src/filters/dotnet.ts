import { Type, Class, ModuleElement, ModuleElementKind, PrimitiveType } from '../interfaces'
import { CachedConfig } from '../config'
import { objName, log } from '../utils'

export function typeNameFn( args: {
	config: CachedConfig, 
	primitiveTypeMap: { type: PrimitiveType; name: string }[],
	objType: string, 
	makeArray: (type: string) => string,
	makeGenericParameter: (type: string) => string
} ) 
{
	const primitiveTypeMap = args.primitiveTypeMap.reduce( (obj, x) => { obj[x.type] = x.name; return obj; }, <{ [key: number]: string }>{} );

	return typeName;

	function typeName( e: ModuleElement, includeNamespace?: boolean ): string {
		if ( !e ) return "";

		if ( e.Kind === ModuleElementKind.Type ) {
			if ( e.Array ) return args.makeArray( typeName( e.Array(), includeNamespace ) );
			if ( e.PrimitiveType ) return primitiveTypeMap[e.PrimitiveType] || args.objType;
			if ( e.GenericParameter ) return args.makeGenericParameter( e.GenericParameter().Name )
		}

		const n = objName( e );
		if ( !n ) return args.objType;
		if ( e.Kind === ModuleElementKind.Type && e.GenericParameter ) return n;

		if ( includeNamespace ){
			var ns = typeNamespace( args.config, e );
			if ( ns ) ns += '.';
			return ns + n;
		}
		else {
			return n;
		}
	}
}

export function typeNamespace( config: CachedConfig, e: ModuleElement ) {
	if ( !e || !e.Document || !e.Document.Path ) return "";

	const realPath = config.Host.ResolveRelativePath( e.Document.Path, config.Original.RootDir );
	const directory = config.Host.GetParentDirectory( realPath );
	const directoryRelativeToRoot = config.Host.MakeRelativePath( config.Original.RootDir, directory );

	if ( !directoryRelativeToRoot || directoryRelativeToRoot === '.' ) return "";
	if ( directoryRelativeToRoot[0] === '.' && directoryRelativeToRoot[1] === '.' ) return "";
	return directoryRelativeToRoot
		.replace( /[\.\-\+]/g, '_' )
		.replace( /[\/\\]/g, '.' );
}
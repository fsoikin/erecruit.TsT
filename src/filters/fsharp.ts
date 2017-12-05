import { ModuleElement, PrimitiveType } from '../interfaces'
import { CachedConfig } from '../config'
import { typeNameFn, typeNamespace } from './dotnet'

export function markupFilters( config: CachedConfig ): { [key: string]: (...args: any[]) => any } {
	const typeName = typeNameFn( { 
		config, 
		primitiveTypeMap: [
			{ type: PrimitiveType.Any, name: "obj" },
			{ type: PrimitiveType.String, name: "string" },
			{ type: PrimitiveType.Boolean, name: "bool" },
			{ type: PrimitiveType.Number, name: "int" } ],
		objType: "obj",
		makeArray: t => t + "[]",
		makeGenericParameter: t => "'" + t
	} );

	return {
		fs_typeName: typeName,
		fs_typeNamespace: typeNamespace,
		fs_typeFullName: ( e: ModuleElement ) => typeName( e, true ),
	};
}
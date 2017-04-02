import { ModuleElement, PrimitiveType } from '../interfaces'
import { CachedConfig } from '../config'
import { typeNameFn, typeNamespace } from './dotnet'

export function markupFilters( config: CachedConfig ): { [key: string]: (...args: any[]) => any } {
	const typeName = typeNameFn( { 
		config, 
		primitiveTypeMap: [
			{ type: PrimitiveType.Any, name: "object" },
			{ type: PrimitiveType.String, name: "string" },
			{ type: PrimitiveType.Boolean, name: "bool" },
			{ type: PrimitiveType.Number, name: "int" } ],
		objType: "object",
		makeArray: t => t + "[]",
		makeGenericParameter: t => t
	} );

	return {
		cs_typeName: typeName,
		cs_typeNamespace: typeNamespace,
		cs_typeFullName: ( e: ModuleElement ) => typeName( e, true ),
		cs_isEmptyNamespace: ( e: ModuleElement ) => typeNamespace( config, e ) ? <any>e : false
	};
}
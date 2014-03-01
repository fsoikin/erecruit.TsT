/// <reference path="../../lib/dust/dust.d.ts" />
/// <reference path="../../lib/linq/linq.d.ts" />
/// <reference path="../interfaces.ts" />
/// <reference path="../emitter.ts" />
/// <reference path="../config.ts" />

module erecruit.TsT.CSharp {
	dust.helpers['csharpClass'] = ( chunk: dust.Chunk, ctx: dust.Context, bodies: any, params: any ) => {
		var type: Type = ctx.current();
		var config = Config.fromDustContext( ctx );
		if ( !type || !config ) return chunk;

		return chunk.render( bodies.block, dust.makeBase( makeCSharpAST( config, type ) ) );
	};

	var primitiveTypeMap: { [key: number]: string } = <any>Enumerable.from( [
		{ t: PrimitiveType.Any, n: "object" },
		{ t: PrimitiveType.String, n: "string" },
		{ t: PrimitiveType.Boolean, n: "bool" },
		{ t: PrimitiveType.Number, n: "int" }
	] )
		.toObject( x => x.t, x => x.n );

	function typeName( config: CachedConfig, type: Type, includeNamespace?: boolean ) {
		if ( type.Array ) return typeName( config, type.Array, includeNamespace ) + "[]";
		if ( type.PrimitiveType ) return primitiveTypeMap[type.PrimitiveType] || "object";

		var n = TsT.typeName( type );
		if ( !n ) return "object";

		var ns = typeNamespace( config, type );
		if ( ns ) ns += '.';

		return ( includeNamespace ? ns : "" ) + n;
	}

	function typeNamespace( config: CachedConfig, type: Type ) {
		if ( !type.Module.Path ) return "";
		return config.Host
			.MakeRelativePath( config.Original.RootDir, config.Host.GetParentDirectory( type.Module.Path ) )
			.replace( /[\/\\]/, '.' );
	}

	function makeCSharpAST( config: CachedConfig, type: Type ) {
		return {
			Name: typeName( config, type ),
			Namespace: typeNamespace( config, type ),
			IsInterface: !!type.Interface,
			IsEnum: !!type.Enum,
			IsPrimitive: !!type.PrimitiveType,
			IsGenericParameter: !!type.GenericParameter,
			IsArray: !!type.Array,
			GenericParameters:
			type.Interface && type.Interface.GenericParameters && type.Interface.GenericParameters.length ?
			type.Interface.GenericParameters.map( p => ( { Name: typeName( config, p ) }) )
			: null,
			Properties: type.Interface && type.Interface.Properties.map( p => ( {
				Name: p.Name,
				Type: typeName( config, p.Type, true )
			}) ),
			EnumValues: type.Enum && type.Enum.Values
		};
	}
}
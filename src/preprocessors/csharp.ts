/// <reference path="../../lib/dust/dust.d.ts" />
/// <reference path="../../lib/linq/linq.d.ts" />
/// <reference path="../interfaces.ts" />
/// <reference path="../emitter.ts" />
/// <reference path="../config.ts" />

module erecruit.TsT.CSharp {
	dust.helpers['csharpClass'] = ( chunk: dust.Chunk, ctx: dust.Context, bodies: any, params: any ) => {
		var type: ModuleElement = ctx.current();
		var config = Config.fromDustContext( ctx );
		if ( !type || !config || type.Kind === undefined ) return chunk;

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
		if ( type.GenericParameter ) return n;

		var ns = typeNamespace( config, type );
		if ( ns ) ns += '.';

		return ( includeNamespace ? ns : "" ) + n;
	}

	function typeNamespace( config: CachedConfig, e: ModuleElement ) {
		if ( !e.Module || !e.Module.Path ) return "";
		var relPath = config.Host.MakeRelativePath( config.Original.RootDir, config.Host.GetParentDirectory( e.Module.Path ) );
		if ( relPath[0] == '.' && relPath[1] == '.' ) return "";
		return relPath
			.replace( /[\.\-\+]/, '_' )
			.replace( /[\/\\]/, '.' );
	}

	function makeCSharpAST( config: CachedConfig, e: ModuleElement ) {
		var type = <Type>e, cls = <Class>e;
		var genericPs = e.Kind === ModuleElementKind.Class ? cls.GenericParameters : ( type.Interface && type.Interface.GenericParameters );
		var bases = cls.Implements || (type.Interface && type.Interface.Extends);
		return {
			Name: cls.Name || typeName( config, type ),
			Namespace: typeNamespace( config, e ),
			IsClass: e.Kind === ModuleElementKind.Class,
			IsInterface: !!type.Interface,
			IsEnum: !!type.Enum,
			IsPrimitive: !!type.PrimitiveType,
			IsGenericParameter: !!type.GenericParameter,
			IsArray: !!type.Array,
			GenericParameters: genericPs && genericPs.length ? genericPs.map( (p) => ( { Name: typeName( config, p ) }) ) : null,
			Properties: type.Interface && type.Interface.Properties.map( (p) => ( {
				Name: p.Name,
				Type: typeName( config, p.Type, true )
			}) ),
			EnumValues: type.Enum && type.Enum.Values,
			Constructors: cls.Constructors && cls.Constructors.map( (c) => ({
				GenericParameters: c.GenericParameters && c.GenericParameters.map( (p) => ( { Name: typeName( config, p ) }) ),
				Parameters: c.Parameters && c.Parameters.map( (p) => ( { Name: p.Name, Type: typeName( config, p.Type, true ) }) )
			}) ),
			Extends: bases && bases.map( (i) => ( { Name: typeName( config, i, true ) }) )
		};
	}
}
/// <reference path="../../lib/dust/dust.d.ts" />
/// <reference path="../../lib/linq/linq.d.ts" />
/// <reference path="../interfaces.ts" />
/// <reference path="../emitter.ts" />
/// <reference path="../config.ts" />
/// <reference path="../utils.ts" />

module erecruit.TsT.CSharp {
	typeHelper( 'typeName', typeName );
	typeHelper( 'typeNamespace', typeNamespace );
	typeHelper( 'typeFullName', ( config, type ) => typeName( config, type, true ) );

	dust.helpers['cs_whenEmptyNamespace'] = ( chunk: dust.Chunk, ctx: dust.Context, bodies: any, params: any ) => {
		var type: Type = ctx.current();
		var config = Config.fromDustContext( ctx );
		if ( !type || !config || type.Kind !== ModuleElementKind.Type ) return chunk;
		if ( typeNamespace( config, type ) ) bodies['else'] ? chunk.render( bodies['else'], ctx ) : chunk;
		return chunk.render( bodies.block, ctx );
	};

	function typeHelper( name: string, render: ( config: CachedConfig, type: Type ) => string ) {
		dust.helpers['cs_' + name] = ( chunk: dust.Chunk, ctx: dust.Context, bodies: any, params: any ) => {
			var type: Type = ctx.current();
			var config = Config.fromDustContext( ctx );
			if ( !type || !config || type.Kind !== ModuleElementKind.Type ) return chunk;
			return chunk.write( render( config, type ) );
		};
	}

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
		if ( !relPath || relPath === '.' ) return "";
		if ( relPath[0] === '.' && relPath[1] === '.' ) return "";
		return relPath
			.replace( /[\.\-\+]/g, '_' )
			.replace( /[\/\\]/g, '.' );
	}
}
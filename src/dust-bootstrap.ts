/// <reference path="../lib/dust/dust.d.ts" />
/// <reference path="../lib/linq/linq.d.ts" />
/// <reference path="interfaces.ts" />

module erecruit.TsT {
	dust.helpers['replace'] = ( chunk: dust.Chunk, ctx: dust.Context, bodies: any, params: { str: string; regex: string; flags: string; replacement: string }) => {
		var str = dust.helpers.tap( params.str, chunk, ctx );
		var regex = dust.helpers.tap( params.regex, chunk, ctx );
		var flags = dust.helpers.tap( params.flags, chunk, ctx );
		var replacement = dust.helpers.tap( params.replacement, chunk, ctx );
		if ( !str || !regex ) return chunk;
		return chunk.write( str.replace( new RegExp( regex, flags ), replacement || "" ) );
	};

	dust.helpers['test'] = ( chunk: dust.Chunk, ctx: dust.Context, bodies: any, params: { str: string; regex: string; flags: string; }) => {
		var str = dust.helpers.tap( params.str, chunk, ctx );
		var regex = dust.helpers.tap( params.regex, chunk, ctx );
		var flags = dust.helpers.tap( params.flags, chunk, ctx );
		if ( !str || !regex || !new RegExp( regex, flags ).test( str ) ) return bodies['else'] ? chunk.render( bodies['else'], ctx ) : chunk;
		return chunk.render( bodies.block, ctx );
	};

	dust.helpers['typeName'] = ( chunk: dust.Chunk, ctx: dust.Context, bodies: any, params: { path: string }) => {
		var type: Type = ctx.current();
		if ( type ) return chunk.write( erecruit.TsT.objName( type ) );
		else return chunk;
	};

	dust.helpers['indent'] = ( chunk: dust.Chunk, ctx: dust.Context, bodies: any, params: { count: number }) => {
		return chunk.write( Enumerable.repeat( "\t", ( params && dust.helpers.tap( params.count, chunk, ctx ) ) || 1 ).toArray().join( '' ) );
	};

	[
		{ name: 'whenType', kind: erecruit.TsT.ModuleElementKind.Type },
		{ name: 'whenClass', kind: erecruit.TsT.ModuleElementKind.Class }
	]
		.forEach( x =>
			dust.helpers[x.name] = ( chunk: dust.Chunk, ctx: dust.Context, bodies: any, params: { count: number }) => {
				var t: erecruit.TsT.ModuleElement = ctx.current();
				if ( typeof t === "function" ) t = ( <any>t )();

				debug( () => {
					var k = erecruit.TsT.ModuleElementKind[x.kind];
					return "when" + k + ": Checking if current context is a " + k;
				});
				if ( t && t.Kind === x.kind ) return chunk.render( bodies.block, ctx );
				return bodies['else'] ? chunk.render( bodies['else'], ctx ) : chunk;
			});

	dust.helpers['fs_fileNameWithoutExtension'] = ( chunk: dust.Chunk, ctx: dust.Context, bodies: any, params: { path: string }) => {
		var path = dust.helpers.tap( params.path, chunk, ctx );
		var config = erecruit.TsT.Config.fromDustContext( ctx );
		if ( !path || !config ) return chunk;

		var dir = config.Host.GetParentDirectory( path );
		var name = path.substring( (dir == '.' || !dir) ? 0 : dir.length + 1 );
		var nameParts = name.split( '.' );
		return chunk.write( nameParts.slice( 0, nameParts.length - 1 ).join( '.' ) );
	};

	dust.helpers['fs_relativePath'] = ( chunk: dust.Chunk, ctx: dust.Context, bodies: any, params: { from: string; to: string }) => {
		var from = dust.helpers.tap( params.from, chunk, ctx );
		var to = dust.helpers.tap( params.to, chunk, ctx );
		var config = erecruit.TsT.Config.fromDustContext( ctx );
		if ( !to || !config ) return chunk;
		if ( !from ) return chunk.write( to );

		return chunk.write( config.Host.MakeRelativePath( from, to ) );
	};

	dust.helpers['fs_dirName'] = ( chunk: dust.Chunk, ctx: dust.Context, bodies: any, params: { path: string }) => {
		var path = dust.helpers.tap( params.path, chunk, ctx );
		var config = erecruit.TsT.Config.fromDustContext( ctx );
		if ( !path || !config ) return chunk;

		var dir = config.Host.GetParentDirectory( path );
		return chunk.write( dir === '.' ? '' : dir );
	};
}
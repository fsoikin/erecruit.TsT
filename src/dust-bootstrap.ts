/// <reference path="../lib/dust/dust.d.ts" />
/// <reference path="../lib/linq/linq.d.ts" />
/// <reference path="interfaces.ts" />

//dust.optimizers.format = ( _, node ) => node;

dust.helpers['replace'] = ( chunk: dust.Chunk, ctx: dust.Context, bodies: any, params: { str: string; regex: string; replacement: string }) => {
	var str = dust.helpers.tap( params.str, chunk, ctx );
	var regex = dust.helpers.tap( params.regex, chunk, ctx );
	var replacement = dust.helpers.tap( params.replacement, chunk, ctx );
	if ( !str || !regex ) return chunk;
	return chunk.write( str.replace( new RegExp( regex ), replacement || "" ) );
};

dust.helpers['typeName'] = ( chunk: dust.Chunk, ctx: dust.Context, bodies: any, params: { path: string }) => {
	var path = params.path && dust.helpers.tap( params.path, chunk, ctx );
	var type = path && ctx.get( path.toString() );
	if ( type ) return chunk.write( erecruit.TsT.typeName( type ) );
	else return chunk;
};

dust.helpers['br'] = ( chunk: dust.Chunk, ctx: dust.Context, bodies: any, params: { path: string }) => {
	return chunk.write( "\r\n" );
};

dust.helpers['indent'] = ( chunk: dust.Chunk, ctx: dust.Context, bodies: any, params: { count: number }) => {
	return chunk.write( Enumerable.repeat( "\t", (params && dust.helpers.tap( params.count, chunk, ctx )) || 1 ).toArray().join('') );
};
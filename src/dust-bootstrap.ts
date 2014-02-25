/// <reference path="../lib/dust/dust.d.ts" />
/// <reference path="./extractor.ts" />
/// <reference path="./interfaces.ts" />
/// <reference path="./config.ts" />

dust.optimizers.format = ( _, node ) => node;

dust.helpers['replace'] = ( chunk: dust.Chunk, ctx: dust.Context, bodies: any, params: { str: string; regex: string; replacement: string }) => {
	var str = dust.helpers.tap( params.str, chunk, ctx );
	var regex = dust.helpers.tap( params.regex, chunk, ctx );
	var replacement = dust.helpers.tap( params.replacement, chunk, ctx );
	if ( !str || !regex ) return chunk;
	return chunk.write( str.replace( new RegExp( regex ), replacement || "" ) );
};

dust.helpers['typeName'] = ( chunk: dust.Chunk, ctx: dust.Context, bodies: any, params: { path: string }) => {
	var path = dust.helpers.tap( params.path, chunk, ctx );
	var type = params.path && ctx.get( params.path );
	if ( type ) return chunk.write( TsT.typeName( type ) );
	else return chunk;
};

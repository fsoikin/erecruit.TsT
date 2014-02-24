/// <reference path="../lib/dust/dust.d.ts" />
/// <reference path="./extractor.ts" />
/// <reference path="./interfaces.ts" />
/// <reference path="./config.ts" />

Dust.optimizers.format = ( _, node ) => node;

Dust.helpers['replace'] = ( chunk: Dust.Chunk, ctx: Dust.Context, bodies: any, params: { str: string; regex: string; replacement: string }) => {
	var str = Dust.helpers.tap( params.str, chunk, ctx );
	var regex = Dust.helpers.tap( params.regex, chunk, ctx );
	var replacement = Dust.helpers.tap( params.replacement, chunk, ctx );
	if ( !str || !regex ) return chunk;
	return chunk.write( str.replace( new RegExp( regex ), replacement || "" ) );
};

Dust.helpers['typeName'] = ( chunk: Dust.Chunk, ctx: Dust.Context, bodies: any, params: { path: string }) => {
	var path = Dust.helpers.tap( params.path, chunk, ctx );
	var type = params.path && ctx.get( params.path );
	if ( type ) return chunk.write( TsT.typeName( type ) );
	else return chunk;
};

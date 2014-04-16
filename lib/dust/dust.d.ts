declare module dust {
	function compileFn( source: string ): RenderFn;
	function makeBase( obj: any ): Context;
	function onLoad( name: string, cb: ( out: string, err?: any ) => void ): void;

	interface Callback {
		( err: string, out: string ): void;
	}

	interface StreamRenderFn {
		( context: Context ): Stream;
	}

	interface SimpleRenderFn {
		( context: Context, cb: Callback ): void;
	}

	interface RenderFn extends SimpleRenderFn, StreamRenderFn { }

	interface Context {
		current(): any;
		get( key: string ): any;
		push( head: any, index?: number, length?: number ): Context;
		rebase( head: any ): Context;
	}

	interface Chunk {
		data: string[];
		write( data: string ): Chunk;
		render( block: any, context: Context ): Chunk;
	}

	interface Stream {
		on( type: string, callback: Callback ): Stream;
	}

	var optimizers: {
		format: ( ctx: Context, node: Chunk ) => Chunk;
	}

	var helpers: {
		tap<T>( value: T, chunk: Chunk, ctx: Context ): T;
		[key: string]: any; //( chunk: Chunk, ctx: Context, bodies: { [key: string]: Chunk }, params: { [key: string]: string } ) => Chunk;
	}
}

declare module "dust-helpers" { }
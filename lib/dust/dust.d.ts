declare module dust {
	function compileFn( source: string ): RenderFn;
	function makeBase( obj: any ): Context;

	interface Callback {
		( err: string, out: string ): void;
	}

	interface RenderFn {
		( context: Context ): Stream;
		( context: Context, cb: Callback ): void;
	}

	interface Context {
		current(): any;
		get( key: string ): any;
		push( head: any, index?: number, length?: number ): Context;
		rebase( head: any ): Context;
	}

	interface Chunk {
		data: string[];
		write( data: string ): Chunk;
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
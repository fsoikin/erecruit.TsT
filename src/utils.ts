module erecruit.TsT {
	// This function checks if the argument is a native JS array and returns it.
	// If it's not a native JS array, it is assumed that it's a native .NET array,
	// and then it is converted to a JS array, and then returned.
	export function ensureArray<T>( a: T[] ): T[] {
		var o: any = a;
		if ( Object.prototype.toString.call( a ) === "[object Array]" ) return a;

		a = [];
		for ( var i = 0; i < o.Length; i++ ) a.push( o[i] );
		return a;
	}

	export function typeName( e: ModuleElement, safe: boolean = true ) {
		if ( !e ) return undefined;

		function name( x: { Name: string } ) {
			if ( x ) return x.Name;
			if ( safe ) return '[type is being constructed]';
			throw "Cannot calculate name for a type, because the type is still being constructed";
		}

		var t = <Type>e, c = <Class>e;
		return c.Kind === ModuleElementKind.Class ? c.Name :
			( t.Enum && name( t.Enum() ) )
			|| ( t.GenericParameter && name( t.GenericParameter() ) )
			|| ( t.Interface && name( t.Interface() ) )
			|| ( t.PrimitiveType && PrimitiveType[t.PrimitiveType] )
			|| ( t.GenericInstantiation && typeName( t.GenericInstantiation().Definition, safe ) );
	}

	export function log( msg: () => string ) {
		console.log && console.log( msg() );
	}

	export function debug( msg: () => string ) {
		console.debug && console.debug( msg() );
	}
}
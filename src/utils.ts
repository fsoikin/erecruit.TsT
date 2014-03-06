module erecruit.TsT {
	// This function checks if the argument is a native JS array and returns it.
	// If it's not a native JS array, it is assumed that it's a native .NET array,
	// and then it is converted to a JS array and then returned.
	export function ensureArray<T>( a: T[] ): T[] {
		var o: any = a;
		if ( Object.prototype.toString.call( a ) === "[object Array]" ) return a;

		a = [];
		for ( var i = 0; i < o.Length; i++ ) a.push( o[i] );
		return a;
	}

	export function typeName( e: ModuleElement ) {
		var t = <Type>e, c = <Class>e;
		return c.Kind == ModuleElementKind.Class ? c.Name :
			( t.Enum && t.Enum.Name )
			|| ( t.GenericParameter && t.GenericParameter.Name )
			|| ( t.Interface && t.Interface.Name )
			|| ( t.PrimitiveType && PrimitiveType[t.PrimitiveType] );
	}
}
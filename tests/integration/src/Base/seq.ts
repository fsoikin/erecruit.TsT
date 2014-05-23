export function indexOfFirst<T>( array: T[], predicate: ( t: T ) => boolean ) {
	if( !array || !predicate ) return -1;
	for( var i = 0;i < array.length;i++ ) {
		if( predicate( array[i] ) ) return i;
	}
	return -1;
}

export function copy<T>( array: T[] ): T[] { return array.filter( () => true ); }
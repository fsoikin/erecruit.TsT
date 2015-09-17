import er = require( "../common" );
import ko = require("ko");
import linq = require("linq");

/**
	 This is a late-binding reference that can be materialized into a JavaScript object.
	 "Module" is the AMD module ID, "Class" is the name of a function from that module that will be used as object constructor,
	 and "Arguments" are optional parameters for that function.

	 @ServerSideType erecruit.JS.IClassRef
**/
export interface ClassRef<T> {
	// TODO: [fs] currently this definition assumes that the module ID
	// should be an "absolute" one (i.e. not starting with a dot or two).
	// For my current purposes (instantiating search filters), this is
	// enough. The general plan for the future is to add a "require"
	// field to this interface, which would hold the local require
	// function of whoever created the particular instance.
	Module: string;
	Class?: string;
	Arguments?: any;
}

export function parse<T>( classRef: string, args?: any ): ClassRef<T>;
export function parse( classRef: string, args?: any ): ClassRef<any> {
	var parts = ( classRef || "" ).split( ',' );
	if( parts.length == 1 ) parts = ["", parts[0]];
	if( parts.length != 2 ) { console.warn( "Invalid autobind controller specification: " + classRef ); return null; }

	if( typeof args === "string" ) {
		try { args = new Function( "return (" + args + ");" )(); }
		catch( _ ) { }
	}

	return { Module: parts[1].trim(), Class: parts[0].trim(), Arguments: args };
}

export function bind<T>( ref: ClassRef<T> ) {
	return bindMany( [ref] )[0];
}

export function bindMany<T>(refs: linqjs.IEnumerable<ClassRef<T>>): Ko.Observable<T>[];
export function bindMany<T>(refs: ClassRef<T>[]): Ko.Observable<T>[];
export function bindMany( _refs: any): Ko.Observable<any>[]{
	if (!_refs) return [];
	var refs = linq.from(<ClassRef<any>[]>_refs);
	return refs.select( cr => {
		var r = ko.observable(null);
		if ( cr && cr.Module ) req( linq.make( cr.Module ), m => {
			try { var i = instantiate( m, cr ); }
			catch ( e ) { console.error( e ); return; }
			r( i );
		} );
		return r;
	})
	.toArray();
}

export function bindAll<T>( refs: ClassRef<T>[]): Ko.Observable<T[]>;
export function bindAll<T>( refs: linqjs.IEnumerable<ClassRef<T>>): Ko.Observable<T[]>;
export function bindAll( _refs: any ): Ko.Observable<any[]> {
	if (!_refs) return ko.observableArray<any>();
	var refs = linq.from( <ClassRef<any>[]>_refs);

	var result = ko.observableArray<any>();
	req(refs.select(r => r.Module), function () {
		result(linq.from(arguments).zip(refs, instantiate).toArray());
	} );
	return result;
}

function instantiate( mod, ref: ClassRef<any> ) {
	var ctor = ref.Class ? getClass(mod, ref.Class) : mod;

	// TODO: [fs] this probably shouldn't throw, but should return the error up the chain so that the caller can handle it
	if( !ctor ) throw new Error( "Cannot find '" + (ref.Class||'[export]') + "' in module '" + ref.Module + "'." );
	if( typeof ( ctor ) != "function" ) throw new Error( "Cannot instantiate '" + (ref.Class||'[export]') + "' from module '" + ref.Module + "' because it is not a function." );

	if (ref.Arguments !== undefined && ref.Arguments !== null) {
		ctor = (ctor => {
			function _f() {
				this.constructor = ctor;
				ctor.apply(this, $.isArray(ref.Arguments) ? ref.Arguments : [ref.Arguments]);
			}
			_f.prototype = ctor.prototype;
			return _f;
		})(ctor);
	}

	return new ctor();
}

function getClass( mod, cls: string ) {
	return cls.split( '.' ).reduce( (m,p) => m[p], mod );
}

var req = (() => {
	var loadedModules: { [key: string]: any } = {};

	return function( deps: linqjs.IEnumerable<string>, cb: Function ) {
		var loaded = deps.select( d => loadedModules[d] );
		var _this = this;
		if( loaded.all( d => !!d ) ) cb.apply( _this, loaded.toArray() );
		else require( deps.toArray(), function() {
			loaded = deps.zip(arguments, (d,r) => ( loadedModules[d] = r, r ) );
			cb.apply( _this, loaded.toArray() );
		} );
	};
} )();
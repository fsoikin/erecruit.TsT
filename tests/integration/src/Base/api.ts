/// <amd-dependency path="ApiRoot" />
/// <amd-dependency path="MvcRoot" />
/// <reference path="../../tsd/jquery.d.ts"/>
/// <reference path="../../tsd/knockout.d.ts"/>

import ko = require( "ko" );
import rx = require( "rx" );

export var WebApiRootUrl: string;
export var MvcRootUrl: string;

export var MimeTypes = {
	Json: "application/json"
};

export interface JsonResponse {
	Success: boolean;
	Result: any;
	Messages: string[];
}

export function GetKo( url: string, data: any,
	inProgress: Ko.Observable<boolean>, error: (err: string) => void,
	onSuccess: ( result: any ) => void, options?: {});
export function GetKo( url: string, data: any,
	inProgress: Ko.Observable<boolean>, error: Ko.Subscribable<string>,
	onSuccess: ( result: any ) => void, options?: {});
export function GetKo( url: string, data: any,
	inProgress: Ko.Observable<boolean>, error: any,
	onSuccess: ( result: any ) => void, options?: {} )
{
	return CallKo( "GET", url, data, inProgress, error, onSuccess, options );
}

export function PostKo( url: string, data: any,
	inProgress: Ko.Observable<boolean>, error: (err: string) => void,
	onSuccess: ( result: any ) => void, options?: {});
export function PostKo( url: string, data: any,
	inProgress: Ko.Observable<boolean>, error: Ko.Subscribable<string>,
	onSuccess: ( result: any ) => void, options?: {})
export function PostKo( url: string, data: any,
	inProgress: Ko.Observable<boolean>, error: any,
	onSuccess: ( result: any ) => void, options?: {})
{
	return CallKo( "POST", url, JSON.stringify( data ), inProgress, error, onSuccess, $.extend( { contentType: 'application/json' }, options ) );
}

export function CallKo( method: string, url: string, data: any,
	inProgress: Ko.Observable<boolean>, error: (err: string) => void,
	onSuccess: ( result: any ) => void, options?: {});
export function CallKo( method: string, url: string, data: any,
	inProgress: Ko.Observable<boolean>, error: Ko.Subscribable<string>,
	onSuccess: ( result: any ) => void, options?: {});
export function CallKo( method: string, url: string, data: any,
	inProgress: Ko.Observable<boolean>, error: any,
	onSuccess: ( result: any ) => void, options?: {})
{
	var errCb =
		!error ? null :
		typeof error === "function" ? error :
		ko.isSubscribable( error ) ? ( m: string ) => ( <Ko.Subscribable<string>>error ).notifySubscribers( m )
		: null;

	inProgress && inProgress( true );
	return $
		.ajax( $.extend( options || {}, { type: method, url: AbsoluteUrl( url ), data: data } ) )
		.fail( e => errCb && errCb( e.statusText ) )
		.done( ( e: JsonResponse ) => e.Success
			? ( onSuccess && onSuccess( e.Result ) )
			: ( errCb && errCb( ( e.Messages || [] ).join() ) ) )
		.always( () => inProgress && inProgress( false ) );
}

export function GetRx<T>( url: string, data?: any, options?: any ) {
	return CallRx<T>( "GET", url, data, options );
}

export function PostRx<T>( url: string, data?: any, options?: any ) {
	return CallRx<T>( "POST", url, JSON.stringify( data ), $.extend( { contentType: 'application/json' }, options ) );
}

export function CallRx<T>( method: string, url: string, data?: any, options?: any ) {
	return rx.Observable.create<T>( o => {
		var xhr = $
			.ajax( $.extend( options || {}, { type: method, url: AbsoluteUrl( url ), data: data }) )
			.fail( e => o.onError( e ) )
			.done( ( x: JsonResponse ) => x.Success
				? ( o.onNext( x.Result ) )
				: ( o.onError( ( x.Messages || [] ).join() ) ) )
			.always( e => o.onCompleted() );
		return () => xhr.abort();
	});
}

export function AbsoluteUrl( url: string ) {
	if ( !url ) return url;
	if ( url[0] === '/' ) url = url.substring( 1 );
	if ( url[0] === '/' ) return url.substring( 1 ); // Don't translate URLs starting with double slash

	var base = WebApiRootUrl;
	if( url[0] === '~' && url[1] === '/' ) {
		url = url.substring( 2 );
		base = MvcRootUrl;
	}

	return base + url;
}

(() => {
	var normalizeUrl = url =>
		typeof url !== "string" || !url.length
			? "/"
			: url[url.length-1] == '/' ? url : url + '/';

	WebApiRootUrl = normalizeUrl( <string> require( "ApiRoot" ) );
	MvcRootUrl = normalizeUrl( <string> require( "MvcRoot" ) );
} )();
/// <reference path="tsd/require.d.ts"/>
/// <reference path="tsd/polyfill.d.ts"/>
/// <reference path="tsd/jquery.d.ts"/>
/// <reference path="tsd/jqueryui.d.ts"/>
/// <reference path="tsd/kendo.d.ts" />
/// <reference path="../../../lib/rx/rx.d.ts" />
/// <reference path="tsd/rx.dom.d.ts" />
/// <reference path="tsd/rx.amd.d.ts" />
/// <reference path="tsd/linq.d.ts"/>
/// <reference path="tsd/linq.amd.d.ts"/>
/// <reference path="tsd/knockout-2.2.d.ts"/>
/// <reference path="tsd/knockout.mapping-2.0.d.ts"/>
/// <reference path="tsd/moment.d.ts" />

import rx = require( "rx" );
import ko = require( "ko" );
import map = require( "ko.mapping" );
import moment = require( 'moment' );
export import Api = require( "./Base/api" );
export import Seq = require( "./Base/seq" );
export import Keys = require( "./Base/keys" );
export import Dynamic = require( "./Base/dynamic" );
export import UserSettings = require( "./Base/userSettings" );

/**
 * Represents system-wide ID of an AboutObject - i.e. combines AboutType
 * and ID of the object itself.
 * Defined in Library/JS/AboutObjectId.cs
 */
export class AboutObjectId {
	constructor(
		public ReferenceId: number,
		public AboutType: AboutType
	)
	{}
}

export enum AboutType {
	Company = 1,
	Contact = 2,
	Opportunity = 3,
	Position = 4,
	Match = 5,
	Candidate = 6,
	Recruiter = 7,
	CandidateApplication = 8,
	ScheduledItem = 9,
	RecruiterCommisionPlan = 10,
	CandidateReference = 11,
	Timesheet = 12,
	Agreement = 13,
	Invoice = 17,
	Note = 18,
	Transaction = 19,
	VendorManager = 20,
	ClientProject = 21,
	Vendor = 31,
	VendorContact = 37,
	EmailTemplate = 50,
	PrintTemplate = 51,
	InvoiceTemplate = 52,
	SignatureDocumentTemplate = 53,
	DocumentSignature = 54,
	FolderGroup = 55,
	Address = 60,
	Department = 61,
	CompanyDepartment = 62,
	LegalCase = 70,
	Litigation = 71,
	MarketingCampaign = 80,
	Seed = 90,
	HRNetPage = 100,
	ObjectRequirement = 220,
	Incident = 230,
	ScheduledEmail = 240,
	Shift = 250
}

export interface User {
	Id: string;
	Name: string;
	Kind?: UserKind;
	ReferenceId?: number;
}

export enum UserKind {
	Recruiter = 0, Contact = 1, Candidate = 2
}

export enum SharingOptions {
	Recruiters = 1,
	Vendors = 2,
	VendorManagers = 4,
	Contacts = 8,
	Candidates = 16,

	Nobody = 0,
	Everyone = Recruiters | Vendors | VendorManagers | Candidates | Contacts
}

export enum LoggedInAsModes {
	Recruiter = 1,
	Candidate = 2,
	Contact = 4,
	Vendor = 8,
	VendorManager = 16,
	API = 32,

	None = 0,
	All = Recruiter | Vendor | VendorManager | Candidate | Contact,
	NotVendor = All & ~Vendor
};

export interface NameValuePair<T> {
	Name: string;
	Value: T;
}

export interface Range<T> {
	Start: T;
	End: T;
}

export interface IHaveId<TId> { Id: TId; }
export interface IHaveName { Name: string; }
export interface IHaveNameAndId<TId> extends IHaveId<TId>, IHaveName { }

/**
 * Represents a "sub-viewmodel" that can be used in combination with the
 * "control" Knockout binding. This allows for composing viewmodels out
 * of independent parts, much like "control trees" are composed in WinForms
 * or WPF - hence the name.
 */
export interface IControl {
	/**
	 * This method is called by the "control" Knockout binding, and the
	 * argument passed represents the element to which this control is bound.
	 */
	OnLoaded( element: Element ): void;

	/**
	 * Should be set to true if the control wants to decide for itself
	 * whether and how to bind its innerHTML.
	 */
	ControlsDescendantBindings?: boolean;
}

/**
 * An extension of IControl that allows for unload notification.
 */
export interface IUnloadableControl extends IControl {
	/**
	 * Called by the "control" Knockout binding when the control's element 
	 * is removed from the DOM or when the binding expression changes in
	 * such a way that it no longer points to the same control.
	 */
	OnUnloaded( element: Element ): void;
}

/**
 * An extension of IControl that allows the control to be bound to a
 * Virtual element (in Knockout sense). 
 */
export interface IVirtualControl extends IControl {
	/**
	 * If SupportsVirtualElements is set to true, the control is allowed
	 * to be bound to virtual element.
	 * If set to false, virtual element will be handled by inserting a <span>
	 * inside and then binding the control to that <span>. Also, a warning
	 * is printed to the console.
	 */
	SupportsVirtualElements: boolean;
}

// TODO: [fs] this doesn't feel general enough, should probably be refactored
/** This interface is used to provide feedback. It would be
 *  instantiated by a top-level component and tied to the UI
 *  (typically, by way of Controls/InfoBox), then passed down to
 *  lower-level components to allow them to provide feedback.
 */
export interface IFeedbackSink {
	Error( text: string );
	Warning( text: string );
	Info( text: string );
	Clear();
}

export function colorToHex(color: number) {
	var res = ((color||0)&0xFFFFFF).toString(16);
	while (res.length < 6) res = '0' + res;
	return '#' + res;
}

export function colorIsDark( color: number ) {
	var r = ( color >> 16 ) & 0xFF, g = ( color >> 8 ) & 0xFF, b = color & 0xFF;
	return ( r * 0.299 + g * 0.587 + b * 0.114 ) < 180;
}

export function mapEnum<TEnum>( enumItself: any ): NameValuePair<TEnum>[]{
	var res = new Array<NameValuePair<TEnum>>();
	for ( var i in enumItself ) {
		var k = parseInt( i );
		if ( typeof k != "number" || isNaN( k ) ) continue;
		res.push( { Name: enumItself[k].toString(), Value: <TEnum><any>k });
	}
	return res;
}

/**
 * Represents virtual sequence of items of a certain type
 */
export interface IDataSource<T> {
	/**
	 * The items comprising the datasource
	 */
	Items: Ko.Observable<T[]>;

	/** Extract unique identifier from a given item */
	GetId( i: T ): any;

	/** Convert a given item to a user-friendly string */
	ToString( i: T ): string;


	/** Signifies whether this datasource loads all of its items
	 *  right after creation or only some of them (or even none).
	 *  When this property is true, the datasource usually supports
	 *  lookup (see the Lookup method).
	 */
	HasPartialItems?: boolean;

	/** Returns a subset of items filtered by the given substring */
	Lookup?: ( term: string ) => Rx.IObservable<T[]>;

	/** Returns a subset of items by given ids */
	GetById?: ( ids: any[] ) => Rx.IObservable<T[]>;

	/** This flag will be set to true when the datasource has finished
	 * loading/preparing items (or whatever other preparation it has to do).
	 * If this flag is not present, then the datasource will be considered
	 * always "ready". See the "dataSourceReady" function.
	 */
	IsReady?: Ko.Observable<boolean>;


	/** True when the items are being fetched from the server, False when done. */
	IsLoading?: Ko.Observable<boolean>;

	/** Pushes messages about errors occurring while fetching items from the
	 *  server.
	 */
	Error?: Ko.Subscribable<string>;
}

// TODO: [fs] This smells
export var SharingOptions_All = mapEnum<SharingOptions>( SharingOptions )
	.filter( o => o.Value != SharingOptions.Nobody && o.Value != SharingOptions.Everyone );

/**
 * A common base for viewmodels - contains often used variables
 */
export class VmBase {
	IsLoading = ko.observable( false );
	IsSaving = ko.observable( false );
	Message = new ko.subscribable();
	Error = ko.observable("");
}

export function compareArrays<T>( a: T[], b: T[],
	comparer: ( x: T, y: T ) => boolean = (( x, y ) => x == y) ) {
	if( !a ) return !b;
	if( !b ) return false;
	if( a.length != b.length ) return false;

	for( var i = 0;i < a.length;i++ ) if( !comparer( a[i], b[i] ) ) return false;

	return true;
}

export function compareDates( a: Date, b: Date, ignoreTime?: boolean ) {
	var
		aDefined = a && a instanceof Date,
		bDefined = b && b instanceof Date;
	if ( !aDefined ) return bDefined ? -1 : 0;
	if ( !bDefined ) return 1;

	var result = ( a.getFullYear() - b.getFullYear() )
		|| ( a.getMonth() - b.getMonth() )
		|| ( a.getDate() - b.getDate() );

	if ( !ignoreTime && !result ) {
		result = a.getTime() - b.getTime();
	}

	return result < 0 ? -1 : result > 0 ? 1 : 0;
}

export enum WeekDays {
	Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday
}

export enum Months {
	January = 1,
	February = 2,
	March = 3,
	April = 4,
	May = 5,
	June = 6,
	July = 7,
	August = 8,
	September = 9,
	October = 10,
	November = 11,
	December = 12
}

/**
 * Given a class (i.e. the constructor function) and an argument for that class'
 * constructor, produces another class that has a constructor with zero arguments,
 * but that constructor produces an instance of the original class as if it was
 * provided the given arguments.
 *
 * For example:
 *   class A { constructor( args: { x: number; y: string; } ) { ... } }
 *   var B = bindClass( A, { x: 1, y: "abc" } );
 *   var b = new B(); // equivalent to new A( { x: 1, y: "abc" } )
 */
export function bindClass<TArgs, TClass>(
	theClass: { new ( arg: TArgs ): TClass; }, args: TArgs )
	: { new (): TClass }
{
	function _f() {
		this.constructor = theClass;
		theClass.call( this, args );
	}
	_f.prototype = theClass.prototype;
	return <any>_f;
}

/**
 * Given a class, which has a constructor accepting an argument of type A, and
 * a function convertArgs: B -> A, produces another class that has a constructor
 * with arguments of type B, but that constructor produces an instance of the
 * original class as if it was provided the arguments of convertArgs(B).
 *
 * For example:
 *   class A { constructor( args: { x: number; y: string; } ) { ... } }
 *   var B = bindClassWithArgs( A, n => { x: n, y: "abc" } );
 *   var b = new B( 5 ); // equivalent to new A( { x: 5, y: "abc" } )
 */
export function bindClassWithArgs<TArgs, TNewArgs, TClass>(
	theClass: { new ( arg: TArgs ): TClass; }, convertArgs: ( args: TNewArgs ) => TArgs )
	: { new (args: TNewArgs): TClass }
{
	function _f( a: TNewArgs ) {
		this.constructor = theClass;
		theClass.call( this, convertArgs( a ) );
	}
	_f.prototype = theClass.prototype;
	return <any>_f;
}

/**
 * Creates a Computed Observable, which is initially bound to 'initialObservable',
 * but after at least one pulse from ALL (not any!) of 'triggers' gets switched
 * to 'nextObservable'.
 *
 * This is useful for defining a class with a complex property, whose value is
 * constructed in a complex way from many asynchronous sources, but the initial
 * value of that property must be kept in a temporary location until those
 * asynchronous sources become available. In this scenario, 'initialObservable'
 * is the temporary location, 'triggers' pulse when the asynchronous sources
 * become available, and 'nextObservable' represents the actual computation of
 * the complex property.
 */
export function switchObservable<T>( triggers: Ko.Subscribable<any>[],
	initialObservable: Ko.Observable<T>, nextObservable: Ko.Observable<T> )
	: Ko.Observable<T>;

/**
 * Creates a Computed Observable, which is initially bound to 'initialObservable',
 * but after at least one pulse from ALL (not any!) of 'triggers' gets switched
 * to 'nextObservable'.
 *
 * This is useful for defining a class with a complex property, whose value is
 * constructed in a complex way from many asynchronous sources, but the initial
 * value of that property must be kept in a temporary location until those
 * asynchronous sources become available. In this scenario, 'initialObservable'
 * is the temporary location, 'triggers' pulse when the asynchronous sources
 * become available, and 'nextObservable' represents the actual computation of
 * the complex property.
 */
export function switchObservable<T>( triggers: Rx.IObservable<any>[],
	initialObservable: Ko.Observable<T>, nextObservable: Ko.Observable<T> )
	: Ko.Observable<T>;

/**
 * Creates a Computed Observable, which is initially bound to 'initialObservable',
 * but after a pulse from 'trigger' gets switched to 'nextObservable'
 *
 * This is useful for defining a class with a complex property, whose value is
 * constructed in a complex way from many asynchronous sources, but the initial
 * value of that property must be kept in a temporary location until those
 * asynchronous sources become available. In this scenario, 'initialObservable'
 * is the temporary location, 'trigger' pulses when the asynchronous sources
 * become available, and 'nextObservable' represents the actual computation of
 * the complex property.
 */
export function switchObservable<T>( trigger: Ko.Subscribable<any>,
	initialObservable: Ko.Observable<T>, nextObservable: Ko.Observable<T> )
	: Ko.Observable<T>;

/**
 * Creates a Computed Observable, which is initially bound to 'initialObservable',
 * but after a pulse from 'trigger' gets switched to 'nextObservable'
 *
 * This is useful for defining a class with a complex property, whose value is
 * constructed in a complex way from many asynchronous sources, but the initial
 * value of that property must be kept in a temporary location until those
 * asynchronous sources become available. In this scenario, 'initialObservable'
 * is the temporary location, 'trigger' pulses when the asynchronous sources
 * become available, and 'nextObservable' represents the actual computation of
 * the complex property.
 */
export function switchObservable<T>( trigger: Rx.IObservable<any>,
	initialObservable: Ko.Observable<T>, nextObservable: Ko.Observable<T> )
	: Ko.Observable<T>;

export function switchObservable<T>( triggers: any,
	initialObservable: Ko.Observable<T>, nextObservable: Ko.Observable<T> )
	: Ko.Observable<T>
{
	var tgrs: Rx.IObservable<any>[] = 
		( $.isArray( triggers ) ? triggers : [triggers] )
			.map( o => {
				if ( ko.isSubscribable( o ) ) {
					var obs = <Ko.Observable<any>>o;
					if ( ko.isObservable(obs) && obs() === true ) return rx.Observable.returnValue( null );
					return koToRx( obs ).skip( 1 ).where( x => x !== false );
				}
				return <Rx.IObservable<any>>o;
			});

	var whenTriggerFired = tgrs
		.reduce( ( zipped: Rx.IObservable<any>, s: Rx.IObservable<any> ) =>
			zipped.zip( s, () => 0 ), rx.Observable.returnValue( 0 ) )
		.take( 1 );

	var write = initialObservable;
	var read = rxToKo(
		koToRx( initialObservable )
		.takeUntil( whenTriggerFired )
		.concat( rx.Observable.defer( () => {
			write = nextObservable;
			nextObservable( initialObservable() );
			return rx.Observable.empty<T>();
		}) )
		.concat( koToRx( nextObservable ).skip(1) ) );

	return ko.computed( { read: read, write: ( v: T ) => write( v ) });
}

/**
 * This function takes in an observable and creates a wrapper for it that only lets
 * through change notifications that carry a new value. That is, if the inner observable
 * produces several notifications with the same value in a row, only one of them will get
 * through.
 */
export function distinctObservable<T>(o: Ko.Observable<T>,
	comparer: (a: T, b: T) => boolean = (a, b) => a == b): Ko.Observable<T> {

		var read = rxToKo( koToRx( o ).distinctUntilChanged( x => x, comparer ) );
		return ko.computed({
			read: () => <T>read(),
			write: (x:T) => o(x)
		});

}

export function rxToKo<T>( rx: Rx.IObservable<T> ): Ko.Observable<T> {
	var res = ko.observable<T>();
	rx && rx.subscribe( res );
	return res;
}

export function koToRx<T>( ko: Ko.Subscribable<T> ): Rx.IObservable<T> {
	return rx.Observable.create( (o: Rx.IObserver<T>) => {
		var d = ko.subscribe( o.onNext, o );
		o.onNext( ko.peek() );
		return () => d.dispose();
	});
}

export function arrayDisplayString<T>( arr: Ko.Observable<T[]>,
	toString: ( t: T ) => string, maxItemsToShow: number = 2 ) {

	return ko.computed( () => {
		if( !arr() || !arr().length ) return "";
		var others = arr().length - maxItemsToShow;

		return arr()
			.slice( 0, maxItemsToShow )
			.map( toString )
			.join( ', ' )

			+ ( others > 0 ? " + " + others : "" );
	});
}

export function escapeHtml( html: string ) {
	return html
		.replace( /&/g, "&amp;" )
		.replace( /</g, "&lt;" )
		.replace( />/g, "&gt;" )
		.replace( /"/g, "&quot;" )
		.replace( /'/g, "&#039;" );
}

export function escapeRegex( str: string ) {
	return str.replace( /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&" );
}

export function toPlural( s: string ) {
	if ( !s ) return s;
	var lastLetter = s[s.length - 1];
	var lastTwoLetters = s.length > 2 ? s.substring( s.length - 2 ) : s;
	var isLowerCase = lastLetter.toLowerCase() === lastLetter;
	lastLetter = lastLetter.toLowerCase();

	if ( lastLetter === 'y' )
		return s.substring( 0, s.length - 1 ) + ( isLowerCase ? "ies" : "IES" );
	else if ( lastLetter === 's' || lastLetter === 'z' || lastLetter === 'x' )
		return s + ( isLowerCase ? "es" : "ES" );
	else if ( lastTwoLetters === "ch" || lastTwoLetters === "sh" )
		return s + ( isLowerCase ? "es" : "ES" );
	else
		return s + ( isLowerCase ? "s" : "S" );
}

export function capitalize( s: string ) {
	if ( !s ) return s;
	return s[0].toUpperCase() + s.substring( 1 );
}

// TODO: [fs] replace it with moment, only need to figure out toJSON
export class DateTime {
	Date: Date;

	constructor( d: Date );
	constructor( d: DateTime );
	constructor( d: string );
	constructor( d: number );
	constructor( d: any ) {
		this.Date =
			( d instanceof DateTime ) ? ( <DateTime>d ).Date :
			( d instanceof Date ) ? d :
			( typeof d === "string" ) ? DateTime.Parse( d ).Date :
			( typeof d === "number" ) ? new Date( d ) :
			new Date( Date.now() );
	}

	static Parse( date: string ) {
		if ( date[10] == 'T' || date[date.length - 1] == 'Z' ) date = date.replace( /[TZ]/g, ' ' );
		return DateTime.From( Date.parse( date ) );
	}

	static From( date: number ) {
		return new DateTime( new Date( date ) );
	}

	static Compare( a: DateTime, b: DateTime, ignoreTime?: boolean ) {
		return !a ? ( !b ? 0 : -1 ) : ( !b ? 1 : compareDates( a.Date, b.Date, ignoreTime ) );
	}

	addMinutes( minutes: number ) {
		return new DateTime( moment( this.Date ).add( moment.duration( minutes * 60 * 1000 ) ).toDate() );
	}

	diffMs( other: DateTime ) {
		return other && moment( this.Date ).diff( moment( other.Date ) );
	}

	diffMinutes( other: DateTime ) {
		return this.diffMs( other ) / 60000;
	}

	toJSON() {
		return this.Date
			? new Date( Date.UTC( this.Date.getFullYear(), this.Date.getMonth(), this.Date.getDate(), this.Date.getHours(), this.Date.getMinutes(), this.Date.getSeconds(), this.Date.getMilliseconds() ) ).toJSON()
			: undefined;
	}

	toString( ignoreTime?: boolean ) {
		return this.Date ? ( ignoreTime ? this.Date.toLocaleDateString() : this.Date.toLocaleString() ) : "";
	}
}
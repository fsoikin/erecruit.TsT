// Type definitions for RxJS
// Project: http://rx.codeplex.com/
// Definitions by: Fyodor Soikin
// Definitions: https://github.com/borisyankov/DefinitelyTyped

declare module "rx" {
	var Disposable: {
		new ( action: () => void ): Rx.Disposable;
		create( action: () => void ): Rx.Disposable;
	};
	var CompositeDisposable: { new ( ...disposables: Rx.IDisposable[] ): Rx.CompositeDisposable; };
	var SingleAssignmentDisposable: { new (): Rx.SingleAssignmentDisposable; };
	var SerialDisposable: { new (): Rx.SerialDisposable; };
	var RefCountDisposable: { new ( disposable: Rx.IDisposable ): Rx.RefCountDisposable; };

	var Scheduler: {
		new ( now: () => number,
			schedule: ( state: any, action: ( scheduler: Rx.IScheduler, state: any ) => Rx.IDisposable ) => Rx.IDisposable,
			scheduleRelative: ( state: any, dueTime: number, action: ( scheduler: Rx.IScheduler, state: any ) => Rx.IDisposable ) => Rx.IDisposable,
			scheduleAbsolute: ( state: any, dueTime: number, action: ( scheduler: Rx.IScheduler, state: any ) => Rx.IDisposable ) => Rx.IDisposable
			): Rx.IScheduler;

		now(): number;
		normalize( timeSpan: number ): number;

		immediate: Rx.IScheduler;
		currentThread: Rx.ICurrentScheduler;
		timeout: Rx.IScheduler;
	};

	var Notification: {
		createOnNext<T>( value: T ): Rx.Notification<T>;
		createOnError<T>( exception ): Rx.Notification<T>;
		createOnCompleted<T>(): Rx.Notification<T>;
	};

	var Observer: {
		create<T>( onNext: ( value: T ) => void , onError?: ( exception: any ) => void , onCompleted?: () => void ): Rx.IObserver<T>;
		fromNotifier<T>( handler: ( notification: Rx.Notification<T> ) => void ): Rx.IObserver<T>;
	};

	var AnonymousObserver: {
		new <T>( onNext: ( value: T ) => void , onError: ( exception: any ) => void , onCompleted: () => void ): Rx.IAnonymousObserver<T>;
	};

	var Observable: {
		new <T>( subscribe: ( observer: Rx.IObserver<T> ) => Rx.IDisposable ): Rx.IObservable<T>;

		start<T>( func: () => T, scheduler?: Rx.IScheduler, context?: any ): Rx.IObservable<T>;
		toAsync( func: Function, scheduler?: Rx.IScheduler, context?: any ): ( ...arguments: any[] ) => Rx.IObservable<any>;
		create<T>( subscribe: ( o: Rx.IObserver<T> ) => () => void ): Rx.IObservable<T>;
		createWithDisposable<T>( subscribe: ( o: Rx.IObserver<T> ) => Rx.IDisposable ): Rx.IObservable<T>;
		defer<T>( observableFactory: () => Rx.IObservable<T> ): Rx.IObservable<T>;
		empty<T>( scheduler?: Rx.IScheduler ): Rx.IObservable<T>;
		fromArray<T>( array: T[], scheduler?: Rx.IScheduler ): Rx.IObservable<T>;
		fromArray<T>( array: { length: number;[index: number]: T; }, scheduler?: Rx.IScheduler ): Rx.IObservable<T>;
		generate<TState, T>( initialState: TState, condition: ( state: TState ) => boolean, iterate: ( state: TState ) => TState, resultSelector: ( state: TState ) => T, scheduler?: Rx.IScheduler ): Rx.IObservable<T>;
		never<T>(): Rx.IObservable<T>;
		range( start: number, count: number, scheduler?: Rx.IScheduler ): Rx.IObservable<number>;
		repeat<T>( value: T, repeatCount?: number, scheduler?: Rx.IScheduler ): Rx.IObservable<T>;
		returnValue<T>( value: T, scheduler?: Rx.IScheduler ): Rx.IObservable<T>;
		throwException<T>( exception: any, scheduler?: Rx.IScheduler ): Rx.IObservable<T>;
		using<TResource extends Rx.IDisposable, T>( resourceFactory: () => TResource, observableFactory: ( resource: TResource ) => Rx.IObservable<T> ): Rx.IObservable<T>;
		amb<T>( ...sources: Rx.IObservable<T>[] ): Rx.IObservable<T>;
		catchException<T>( sources: Rx.IObservable<T>[] ): Rx.IObservable<T>;
		catchException<T>( ...sources: Rx.IObservable<T>[] ): Rx.IObservable<T>;
		concat<T>( ...sources: Rx.IObservable<T>[] ): Rx.IObservable<T>;
		concat<T>( sources: Rx.IObservable<T>[] ): Rx.IObservable<T>;
		merge<T>( ...sources: Rx.IObservable<T>[] ): Rx.IObservable<T>;
		merge<T>( sources: Rx.IObservable<T>[] ): Rx.IObservable<T>;
		merge<T>( scheduler: Rx.IScheduler, ...sources: Rx.IObservable<T>[] ): Rx.IObservable<T>;
		merge<T>( scheduler: Rx.IScheduler, sources: Rx.IObservable<T>[] ): Rx.IObservable<T>;
		onErrorResumeNext<T>( ...sources: Rx.IObservable<T>[] ): Rx.IObservable<T>;
		onErrorResumeNext<T>( sources: Rx.IObservable<T>[] ): Rx.IObservable<T>;

		interval( period: number, scheduler?: Rx.IScheduler );
		timer( dueTime: number, period: number, scheduler?: Rx.IScheduler );
		timer( dueTime: number, scheduler?: Rx.IScheduler );
		timer( dueTime: Date, period: number, scheduler?: Rx.IScheduler );
		timer( dueTime: Date, scheduler?: Rx.IScheduler );
	};

	var Subject: {
		new <T>(): Rx.Subject<T>;
		create<T>( observer: Rx.IObserver<T>, observable: Rx.IObservable<T> ): Rx.Subject<T>;
	};
	var AsyncSubject: { new <T>(): Rx.AsyncSubject<T>; };

	module Internals {
		var ScheduledObserver: {
			new <T>( scheduler: Rx.IScheduler, observer: Rx.IObserver<T> ): Rx.Internals.IScheduledObserver<T>;
		};
		var AnonymousObservable: {
			new <T>( subscribe: ( observer: Rx.IObserver<T> ) => Rx.IDisposable ): Rx.Internals.IAnonymousObservable<T>;
		};
	}

	//#region Disposables
	export interface IDisposable {
		dispose(): void;
	}

	export interface Disposable extends Rx.IDisposable {
		isDisposed: boolean;
		action: () => void;
	}

	export interface CompositeDisposable {
		disposables: Rx.IDisposable[];
		isDisposed: boolean;
		length: number;

		dispose(): void;
		add( item: Rx.IDisposable ): void;
		remove( item: Rx.IDisposable ): boolean;
		clear(): void;
		contains( item: Rx.IDisposable ): boolean;
		toArray(): Rx.IDisposable[];
	}

	export interface SingleAssignmentDisposable {
		isDisposed: boolean;
		current: Rx.IDisposable;

		dispose(): void;
		disposable( value?: Rx.IDisposable ): Rx.IDisposable;
		getDisposable(): Rx.IDisposable;
		setDisposable( value: Rx.IDisposable ): void;
	}

	export interface SerialDisposable {
		isDisposed: boolean;
		current: Rx.IDisposable;

		dispose(): void;
		getDisposable(): Rx.IDisposable;
		setDisposable( value: Rx.IDisposable ): void;
		disposable( value?: Rx.IDisposable ): Rx.IDisposable;
	}

	export interface RefCountDisposable {
		underlyingDisposable: Rx.IDisposable;
		isDisposed: boolean;
		isPrimaryDisposed: boolean;
		count: number;

		dispose(): void;
		getDisposable(): Rx.IDisposable;
	}
	//#endregion

	//#region Schedulers
	export interface IndexedItem {}
	
	export interface IPriorityQueue {
		items: IndexedItem[];
		length: number;

		isHigherPriority( left: number, right: number ): boolean;
		percolate( index: number ): void;
		heapify( index: number ): void;
		peek(): IndexedItem;
		removeAt( index: number ): void;
		dequeue(): IndexedItem;
		enqueue( item: IndexedItem ): void;
		remove( item: IndexedItem ): boolean;
	}

	export interface ScheduledItem {
		scheduler: IScheduler;
		state: any;
		action: ( scheduler: IScheduler, state ) => Rx.IDisposable;
		dueTime: number;
		comparer: ( x: number, y: number ) => number;
		disposable: SingleAssignmentDisposable;

		invoke(): void;
		compareTo( other: ScheduledItem ): number;
		isCancelled(): boolean;
		invokeCore(): Rx.IDisposable;
	}

	export interface IScheduler {
		_schedule: ( state: any, action: ( scheduler: IScheduler, state: any ) => Rx.IDisposable ) => Rx.IDisposable;
		_scheduleRelative: ( state: any, dueTime: number, action: ( scheduler: IScheduler, state: any ) => Rx.IDisposable ) => Rx.IDisposable;
		_scheduleAbsolute: ( state: any, dueTime: number, action: ( scheduler: IScheduler, state: any ) => Rx.IDisposable ) => Rx.IDisposable;

		now(): number;
		scheduleWithState( state: any, action: ( scheduler: IScheduler, state: any ) => Rx.IDisposable ): Rx.IDisposable;
		scheduleWithAbsoluteAndState( state: any, dueTime: number, action: ( scheduler: IScheduler, state: any ) => Rx.IDisposable ): Rx.IDisposable;
		scheduleWithRelativeAndState( state: any, dueTime: number, action: ( scheduler: IScheduler, state: any ) => Rx.IDisposable ): Rx.IDisposable;

		catchException( handler: ( exception: any ) => boolean ): ICatchScheduler;
		schedulePeriodic( period: number, action: () => void ): Rx.IDisposable;
		schedulePeriodicWithState( state: any, period: number, action: ( state: any ) => any ): Rx.IDisposable;//returns {Disposable|SingleAssignmentDisposable}
		schedule( action: () => void ): Rx.IDisposable;
		scheduleWithRelative( dueTime: number, action: () => void ): Rx.IDisposable;
		scheduleWithAbsolute( dueTime: number, action: () => void ): Rx.IDisposable;
		scheduleRecursive( action: ( action: () => void ) => void ): Rx.IDisposable;
		scheduleRecursiveWithState( state: any, action: ( state: any, action: ( state: any ) => void ) => void ): Rx.IDisposable;
		scheduleRecursiveWithRelative( dueTime: number, action: ( action: ( dueTime: number ) => void ) => void ): Rx.IDisposable;
		scheduleRecursiveWithRelativeAndState( state: any, dueTime: number, action: ( state: any, action: ( state: any, dueTime: number ) => void ) => void ): Rx.IDisposable;
		scheduleRecursiveWithAbsolute( dueTime: number, action: ( action: ( dueTime: number ) => void ) => void ): Rx.IDisposable;
		scheduleRecursiveWithAbsoluteAndState( state: any, dueTime: number, action: ( state: any, action: ( state: any, dueTime: number ) => void ) => void ): Rx.IDisposable;
	}

	export interface ICurrentScheduler extends IScheduler {
		scheduleRequired(): boolean;
		ensureTrampoline( action: () => Rx.IDisposable ): Rx.IDisposable;
	}

	export interface IVirtualTimeScheduler extends IScheduler {
		toRelative( duetime ): number;
		toDateTimeOffset( duetime: number ): number;

		clock: number;
		comparer: ( x: number, y: number ) => number;
		isEnabled: boolean;
		queue: IPriorityQueue;
		scheduleRelativeWithState( state: any, dueTime: number, action: ( scheduler: IScheduler, state: any ) => Rx.IDisposable ): Rx.IDisposable;
		scheduleRelative( dueTime: number, action: () => void ): Rx.IDisposable;
		start(): Rx.IDisposable;
		stop(): void;
		advanceTo( time: number );
		advanceBy( time: number );
		sleep( time: number );
		getNext(): ScheduledItem;
		scheduleAbsolute( dueTime: number, action: () => void );
		scheduleAbsoluteWithState( state: any, dueTime: number, action: ( scheduler: IScheduler, state: any ) => Rx.IDisposable ): Rx.IDisposable;
	}

	export interface ICatchScheduler extends IScheduler { }
	//#endregion

	//#region Notifications
	export interface Notification<T> {
		accept( observer: IObserver<T> ): void;
		accept( onNext: ( value: T ) => void , onError?: ( exception: any ) => void , onCompleted?: () => void ): void;
		toObservable( scheduler?: IScheduler ): IObservable<T>;
		hasValue: boolean;
		equals( other: Notification<T> ): boolean;
	}

	//#endregion

	export interface IObserver<T> {
		onNext( value: T ): void;
		onError( exception: any ): void;
		onCompleted(): void;

		toNotifier(): ( notification: Notification<T> ) => void;
		asObserver(): IObserver<T>;
		checked(): ICheckedObserver<T>;
	}

	export module Internals {
		interface IAbstractObserver<T> extends IObserver<T> {
			isStopped: boolean;

			dispose(): void;
			next( value: T ): void;
			error( exception: any ): void;
			completed(): void;
			fail(): boolean;
		}
	}

	export interface IAnonymousObserver<T> extends Internals.IAbstractObserver<T> {
		_onNext: ( value: T ) => void;
		_onError: ( exception: any ) => void;
		_onCompleted: () => void;
	}

	export enum CheckedObserverState { idle /*= 0*/, busy /*= 1*/, done /*= 2*/ }
	
	export interface ICheckedObserver<T> extends IObserver<T> {
		_observer: IObserver<T>;
		_state: CheckedObserverState;
		checkAccess(): void;
	}

	export module Internals {
		export interface IScheduledObserver<T> extends IAbstractObserver<T> {
			scheduler: IScheduler;
			observer: IObserver<T>;
			isAcquired: boolean;
			hasFaulted: boolean;
			queue: { ( value: any ): void; ( exception: Error ): void; (): void; }[];
			disposable: SerialDisposable;

			ensureActive(): void;
		}
	}

	export interface IObservable<T> {
		_subscribe: ( observer: IObserver<T> ) => Rx.IDisposable;

		subscribe( observer: IObserver<T> ): Rx.IDisposable;

		finalValue(): IObservable<T>;
		subscribe( onNext?: ( value: T ) => void , onError?: ( exception: any ) => void , onCompleted?: () => void ): Rx.IDisposable;
		toArray(): IObservable<T>;

		observeOn( scheduler: IScheduler ): IObservable<T>;
		subscribeOn( scheduler: IScheduler ): IObservable<T>;
		amb<U extends T>( rightSource: IObservable<U> ): IObservable<T>;
		catchException( handler: ( exception: any ) => IObservable<T> ): IObservable<T>;
		catchException( second: IObservable<T> ): IObservable<T>;

		combineLatest<U, R>( second: IObservable<U>, resultSelector: ( v1: T, v2: U ) => R ): IObservable<R>;
		//combineLatest<T1, T2, R>( second: IObservable<T1>, third: IObservable<T2>, resultSelector: ( v1: T, v2: T1, v3: T2 ) => R ): IObservable<R>;
		//combineLatest<T1, T2, T3, R>( second: IObservable<T1>, third: IObservable<T2>, fourth: IObservable<T3>, resultSelector: ( v1: T, v2: T1, v3: T2, v4: T3 ) => R ): IObservable<R>;
		//combineLatest<T1, T2, T3, T4, R>( second: IObservable<T1>, third: IObservable<T2>, fourth: IObservable<T3>, fifth: IObservable<T4>, resultSelector: ( v1: T, v2: T1, v3: T2, v4: T3, v5: T4 ) => R ): IObservable<R>;
		//combineLatest<T>( ...soucesAndResultSelector: IObservable<T>[] ): IObservable<T>;
		//combineLatest( ...soucesAndResultSelector: IObservable<any>[] ): IObservable<any>;

		zip<T1, R>( second: T1[], resultSelector: ( left: T, right: T1 ) => R ): IObservable<R>;
		zip<T1, R>( second: IObservable<T1>, resultSelector: ( v1: T, v2: T1 ) => R ): IObservable<R>;
		//zip<T1, T2, R>( second: IObservable<T1>, third: IObservable<T2>, resultSelector: ( v1: T, v2: T1, v3: T2 ) => R ): IObservable<R>;
		//zip<T1, T2, T3, R>( second: IObservable<T1>, third: IObservable<T2>, fourth: IObservable<T3>, resultSelector: ( v1: T, v2: T1, v3: T2, v4: T3 ) => R ): IObservable<R>;
		//zip<T1, T2, T3, T4, R>( second: IObservable<T1>, third: IObservable<T2>, fourth: IObservable<T3>, fifth: IObservable<T4>, resultSelector: ( v1: T, v2: T1, v3: T2, v4: T3, v5: T4 ) => R ): IObservable<R>;
		//zip( ...soucesAndResultSelector: any[] ): IObservable<any>;

		concat( ...sources: IObservable<T>[] ): IObservable<T>;
		concat( sources: IObservable<T>[] ): IObservable<T>;

		merge( maxConcurrent: number ): IObservable<T>;
		merge<U extends T>( other: IObservable<U> ): IObservable<T>;

		onErrorResumeNext<U extends T>( second: IObservable<U> ): IObservable<T>;
		skipUntil<U>( other: IObservable<U> ): IObservable<T>;
		switchLatest(): IObservable<T>;
		takeUntil<U>( other: IObservable<U> ): IObservable<T>;
		asIObservable(): IObservable<T>;
//		bufferWithCount( count: number, skip?: number ): IObservable<T[]>;
		distinctUntilChanged<TKey>( keySelector?: ( value: T ) => TKey, comparer?: ( x: TKey, y: TKey ) => boolean ): IObservable<T>;
		doAction( observer: IObserver<T> ): IObservable<T>;
		doAction( onNext: ( value: T ) => void , onError?: ( exception: any ) => void , onCompleted?: () => void ): IObservable<T>;
		finallyAction( action: () => void ): IObservable<T>;
		ignoreElements(): IObservable<T>;
//		materialize(): IObservable<Notification<T>>;
		repeat( repeatCount?: number ): IObservable<T>;
		retry( retryCount?: number ): IObservable<T>;
		scan<TAcc>( seed: TAcc, accumulator: ( acc: TAcc, value: T ) => TAcc ): IObservable<TAcc>;
		scan( accumulator: ( acc: T, value: T ) => T ): IObservable<T>;
		skipLast( count: number ): IObservable<T>;
		startWith( ...values: T[] ): IObservable<T>;
		startWith( scheduler: IScheduler, ...values: T[] ): IObservable<T>;
		takeLast( count: number, scheduler?: IScheduler ): IObservable<T>;
		takeLastBuffer( count: number ): IObservable<T>;
		windowWithCount( count: number, skip?: number ): IObservable<T>;
		defaultIfEmpty( defaultValue?: T ): IObservable<T>;
		distinct<TKey>( keySelector?: ( value: T ) => TKey, keySerializer?: ( key: TKey ) => string ): IObservable<T>;
		groupBy<TKey, TValue>( keySelector: ( value: T ) => TKey, elementSelector?: ( value: T ) => TValue, keySerializer?: ( key: TKey ) => string ): IObservable<IGrouping<TKey, TValue>>;
		groupByUntil<TKey, TValue>( keySelector: ( value: T ) => TKey, elementSelector: ( value: T ) => TValue, durationSelector: ( group: IGrouping<TKey, TValue> ) => IObservable<any>, keySerializer?: ( key: TKey ) => string ): IObservable<IGrouping<TKey, TValue>>;
		select<U>( selector: ( value: T, index: number ) => U ): IObservable<U>;
		selectMany<U>( selector: ( value: T ) => IObservable<U> ): IObservable<U>;
		selectMany<U, R>( selector: ( value: T ) => IObservable<U>, resultSelector: ( x: T, y: U ) => R ): IObservable<R>;
		selectMany<U>( other: IObservable<U> ): IObservable<U>;
		skip( count: number ): IObservable<T>;
		skipWhile( predicate: ( value: T, index?: number ) => boolean ): IObservable<T>;
		take( count: number, scheduler?: IScheduler ): IObservable<T>;
		takeWhile( predicate: ( value: T, index?: number ) => boolean ): IObservable<T>;
		where( predicate: ( value: T, index?: number ) => boolean ): IObservable<T>;

		delay( interval: number, scheduler?: Rx.IScheduler ): IObservable<T>;
		delay( dueTime: Date, scheduler?: Rx.IScheduler ): IObservable<T>;

		throttle( interval: number, scheduler?: Rx.IScheduler ): IObservable<T>;
	}

	//	interface IObservable<T extends Notification<U>> {
	//		dematerialize(): IObservable<U>;
	//	}

	//	interface IObservable<T extends IObservable<U>> {
	//		concatIObservable(): IObservable<U>;
	//		mergeIObservable(): IObservable<U>;
	//	}

	export module Internals {
		interface IAnonymousObservable<T> extends IObservable<T> { }
	}

	export interface IGrouping<TKey, TValue> extends IObservable<TValue> {
		key: TKey;
	}

	export interface Subject<T> extends IObservable<T>, IObserver<T> {
		isDisposed: boolean;
		isStopped: boolean;
		observers: IObserver<T>[];

		dispose(): void;
	}

	export interface AsyncSubject<T> extends IObservable<T>, IObserver<T> {
		isDisposed: boolean;
		value: any;
		hasValue: boolean;
		observers: IObserver<T>[];
		exception: any;

		dispose(): void;
	}

	export interface AnonymousSubject<T> extends IObservable<T> {
		onNext( value: T ): void;
		onError( exception: any ): void;
		onCompleted(): void;
	}
}
declare module Rx {
	var Disposable: {
		new ( action: () => void ): Disposable;
		create( action: () => void ): Disposable;
	};
	var CompositeDisposable: { new ( ...disposables: IDisposable[] ): CompositeDisposable; };
	var SingleAssignmentDisposable: { new (): SingleAssignmentDisposable; };
	var SerialDisposable: { new (): SerialDisposable; };
	var RefCountDisposable: { new ( disposable: IDisposable ): RefCountDisposable; };

	var Scheduler: {
		new ( now: () => number,
			schedule: ( state: any, action: ( scheduler: IScheduler, state: any ) => IDisposable ) => IDisposable,
			scheduleRelative: ( state: any, dueTime: number, action: ( scheduler: IScheduler, state: any ) => IDisposable ) => IDisposable,
			scheduleAbsolute: ( state: any, dueTime: number, action: ( scheduler: IScheduler, state: any ) => IDisposable ) => IDisposable
			): IScheduler;

		now(): number;
		normalize( timeSpan: number ): number;

		immediate: IScheduler;
		currentThread: ICurrentScheduler;
		timeout: IScheduler;
	};

	var Notification: {
		createOnNext<T>( value: T ): Notification<T>;
		createOnError<T>( exception: any ): Notification<T>;
		createOnCompleted<T>(): Notification<T>;
	};

	var Observer: {
		create<T>( onNext: ( value: T ) => void , onError?: ( exception: any ) => void , onCompleted?: () => void ): IObserver<T>;
		fromNotifier<T>( handler: ( notification: Notification<T> ) => void ): IObserver<T>;
	};

	var AnonymousObserver: {
		new <T>( onNext: ( value: T ) => void , onError: ( exception: any ) => void , onCompleted: () => void ): IAnonymousObserver<T>;
	};

	var Observable: {
		new <T>( subscribe: ( observer: IObserver<T> ) => IDisposable ): IObservable<T>;

		start<T>( func: () => T, scheduler?: IScheduler, context?: any ): IObservable<T>;
		toAsync( func: Function, scheduler?: IScheduler, context?: any ): ( ...arguments: any[] ) => IObservable<any>;
		create<T>( subscribe: ( o: IObserver<T> ) => () => void ): IObservable<T>;
		createWithDisposable<T>( subscribe: ( o: IObserver<T> ) => IDisposable ): IObservable<T>;
		defer<T>( observableFactory: () => IObservable<T> ): IObservable<T>;
		empty<T>( scheduler?: IScheduler ): IObservable<T>;
		fromArray<T>( array: T[], scheduler?: IScheduler ): IObservable<T>;
		fromArray<T>( array: { length: number;[index: number]: T; }, scheduler?: IScheduler ): IObservable<T>;
		generate<TState, T>( initialState: TState, condition: ( state: TState ) => boolean, iterate: ( state: TState ) => TState, resultSelector: ( state: TState ) => T, scheduler?: IScheduler ): IObservable<T>;
		never<T>(): IObservable<T>;
		range( start: number, count: number, scheduler?: IScheduler ): IObservable<number>;
		repeat<T>( value: T, repeatCount?: number, scheduler?: IScheduler ): IObservable<T>;
		returnValue<T>( value: T, scheduler?: IScheduler ): IObservable<T>;
		throwException<T>( exception: any, scheduler?: IScheduler ): IObservable<T>;
		using<TResource extends IDisposable, T>( resourceFactory: () => TResource, observableFactory: ( resource: TResource ) => IObservable<T> ): IObservable<T>;
		amb<T>( ...sources: IObservable<T>[] ): IObservable<T>;
		catchException<T>( sources: IObservable<T>[] ): IObservable<T>;
		catchException<T>( ...sources: IObservable<T>[] ): IObservable<T>;
		concat<T>( ...sources: IObservable<T>[] ): IObservable<T>;
		concat<T>( sources: IObservable<T>[] ): IObservable<T>;
		merge<T>( ...sources: IObservable<T>[] ): IObservable<T>;
		merge<T>( sources: IObservable<T>[] ): IObservable<T>;
		merge<T>( scheduler: IScheduler, ...sources: IObservable<T>[] ): IObservable<T>;
		merge<T>( scheduler: IScheduler, sources: IObservable<T>[] ): IObservable<T>;
		onErrorResumeNext<T>( ...sources: IObservable<T>[] ): IObservable<T>;
		onErrorResumeNext<T>( sources: IObservable<T>[] ): IObservable<T>;

		interval( period: number, scheduler?: IScheduler ): IObservable<any>;
		timer( dueTime: number, period: number, scheduler?: IScheduler ): IObservable<any>;
		timer( dueTime: number, scheduler?: IScheduler ): IObservable<any>;
		timer( dueTime: Date, period: number, scheduler?: IScheduler ): IObservable<any>;
		timer( dueTime: Date, scheduler?: IScheduler ): IObservable<any>;
	};

	var Subject: {
		new <T>(): Subject<T>;
		create<T>( observer: IObserver<T>, observable: IObservable<T> ): Subject<T>;
	};
	var AsyncSubject: { new <T>(): AsyncSubject<T>; };

	module Internals {
		var ScheduledObserver: {
			new <T>( scheduler: IScheduler, observer: IObserver<T> ): Internals.IScheduledObserver<T>;
		};
		var AnonymousObservable: {
			new <T>( subscribe: ( observer: IObserver<T> ) => IDisposable ): Internals.IAnonymousObservable<T>;
		};
	}

	//#region Disposables
	export interface IDisposable {
		dispose(): void;
	}

	export interface Disposable extends IDisposable {
		isDisposed: boolean;
		action: () => void;
	}

	export interface CompositeDisposable {
		disposables: IDisposable[];
		isDisposed: boolean;
		length: number;

		dispose(): void;
		add( item: IDisposable ): void;
		remove( item: IDisposable ): boolean;
		clear(): void;
		contains( item: IDisposable ): boolean;
		toArray(): IDisposable[];
	}

	export interface SingleAssignmentDisposable {
		isDisposed: boolean;
		current: IDisposable;

		dispose(): void;
		disposable( value?: IDisposable ): IDisposable;
		getDisposable(): IDisposable;
		setDisposable( value: IDisposable ): void;
	}

	export interface SerialDisposable {
		isDisposed: boolean;
		current: IDisposable;

		dispose(): void;
		getDisposable(): IDisposable;
		setDisposable( value: IDisposable ): void;
		disposable( value?: IDisposable ): IDisposable;
	}

	export interface RefCountDisposable {
		underlyingDisposable: IDisposable;
		isDisposed: boolean;
		isPrimaryDisposed: boolean;
		count: number;

		dispose(): void;
		getDisposable(): IDisposable;
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
		action: ( scheduler: IScheduler, state: any ) => IDisposable;
		dueTime: number;
		comparer: ( x: number, y: number ) => number;
		disposable: SingleAssignmentDisposable;

		invoke(): void;
		compareTo( other: ScheduledItem ): number;
		isCancelled(): boolean;
		invokeCore(): IDisposable;
	}

	export interface IScheduler {
		_schedule: ( state: any, action: ( scheduler: IScheduler, state: any ) => IDisposable ) => IDisposable;
		_scheduleRelative: ( state: any, dueTime: number, action: ( scheduler: IScheduler, state: any ) => IDisposable ) => IDisposable;
		_scheduleAbsolute: ( state: any, dueTime: number, action: ( scheduler: IScheduler, state: any ) => IDisposable ) => IDisposable;

		now(): number;
		scheduleWithState( state: any, action: ( scheduler: IScheduler, state: any ) => IDisposable ): IDisposable;
		scheduleWithAbsoluteAndState( state: any, dueTime: number, action: ( scheduler: IScheduler, state: any ) => IDisposable ): IDisposable;
		scheduleWithRelativeAndState( state: any, dueTime: number, action: ( scheduler: IScheduler, state: any ) => IDisposable ): IDisposable;

		catchException( handler: ( exception: any ) => boolean ): ICatchScheduler;
		schedulePeriodic( period: number, action: () => void ): IDisposable;
		schedulePeriodicWithState( state: any, period: number, action: ( state: any ) => any ): IDisposable;//returns {Disposable|SingleAssignmentDisposable}
		schedule( action: () => void ): IDisposable;
		scheduleWithRelative( dueTime: number, action: () => void ): IDisposable;
		scheduleWithAbsolute( dueTime: number, action: () => void ): IDisposable;
		scheduleRecursive( action: ( action: () => void ) => void ): IDisposable;
		scheduleRecursiveWithState( state: any, action: ( state: any, action: ( state: any ) => void ) => void ): IDisposable;
		scheduleRecursiveWithRelative( dueTime: number, action: ( action: ( dueTime: number ) => void ) => void ): IDisposable;
		scheduleRecursiveWithRelativeAndState( state: any, dueTime: number, action: ( state: any, action: ( state: any, dueTime: number ) => void ) => void ): IDisposable;
		scheduleRecursiveWithAbsolute( dueTime: number, action: ( action: ( dueTime: number ) => void ) => void ): IDisposable;
		scheduleRecursiveWithAbsoluteAndState( state: any, dueTime: number, action: ( state: any, action: ( state: any, dueTime: number ) => void ) => void ): IDisposable;
	}

	export interface ICurrentScheduler extends IScheduler {
		scheduleRequired(): boolean;
		ensureTrampoline( action: () => IDisposable ): IDisposable;
	}

	export interface IVirtualTimeScheduler extends IScheduler {
		toRelative( duetime: number ): number;
		toDateTimeOffset( duetime: number ): number;

		clock: number;
		comparer: ( x: number, y: number ) => number;
		isEnabled: boolean;
		queue: IPriorityQueue;
		scheduleRelativeWithState( state: any, dueTime: number, action: ( scheduler: IScheduler, state: any ) => IDisposable ): IDisposable;
		scheduleRelative( dueTime: number, action: () => void ): IDisposable;
		start(): IDisposable;
		stop(): void;
		advanceTo( time: number ): void;
		advanceBy( time: number ): void;
		sleep( time: number ): void;
		getNext(): ScheduledItem;
		scheduleAbsolute( dueTime: number, action: () => void ): void;
		scheduleAbsoluteWithState( state: any, dueTime: number, action: ( scheduler: IScheduler, state: any ) => IDisposable ): IDisposable;
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
		_subscribe: ( observer: IObserver<T> ) => IDisposable;

		subscribe( observer: IObserver<T> ): IDisposable;

		finalValue(): IObservable<T>;
		subscribe( onNext?: ( value: T ) => void , onError?: ( exception: any ) => void , onCompleted?: () => void ): IDisposable;
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
		bufferWithCount( count: number, skip?: number ): IObservable<T[]>;
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
		takeLastBuffer( count: number ): IObservable<T[]>;
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

		delay( interval: number, scheduler?: IScheduler ): IObservable<T>;
		delay( dueTime: Date, scheduler?: IScheduler ): IObservable<T>;

		throttle( interval: number, scheduler?: IScheduler ): IObservable<T>;
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
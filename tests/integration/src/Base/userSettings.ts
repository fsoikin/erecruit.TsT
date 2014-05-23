import c = require( "../common" );
import api = require( "./api" );
import ko = require( "ko" );
import rx = require( "rx" );

export interface IUserSettingsBucket {
	Get<T>( ContainerID: string ): Rx.IObservable<T>;
	Set<T>( ContainerID: string, container: T ): Rx.IObservable<any>;
	Nest( bucketKey: string ): IUserSettingsBucket;

	/** Establishes a continuous synchronization for the given settings container.
	  * Every time the given observable changes (but throttled), its value is posted
	  * to the server via the Set<T> method. 
	  * @param throttleMilliseconds - throttle period. Default is 2 seconds.
	  */
	Sync<T>( ContainerID: string, container: Ko.Observable<T>, throttleMilliseconds?: number ): Rx.IDisposable;

	/** Establishes a continuous synchronization for the given settings container.
	  * Every time the given observable fires (but throttled), its value is posted
	  * to the server via the Set<T> method. 
	  * @param throttleMilliseconds - throttle period. Default is 2 seconds.
	  */
	Sync<T>( ContainerID: string, container: Rx.IObservable<T>, throttleMilliseconds?: number ): Rx.IDisposable;
}

export interface IUserSettingsService {
	Root(): IUserSettingsBucket;
}

export function GetService(): IUserSettingsService {
	return new UserSettingsService();
}

var Ajax = {
	Get: "~/userSettings/get",
	Set: "~/userSettings/set"
};

// Defined in UI/userSettings/userSettingsGetRequest.cs
interface UserSettingsGetRequest {
	BucketPath: string;
	ContainerID: string;
}

// Defined in UI/userSettings/userSettingsSetRequest.cs
interface UserSettingsSetRequest {
	BucketPath: string;
	ContainerID: string;
	Container: any;
}

class UserSettingsService implements IUserSettingsService {
	private _rootBucket: Bucket;

	Root() {
		return this._rootBucket || (this._rootBucket = new Bucket( this, "" ));
	}
}

class Bucket implements IUserSettingsBucket {
	constructor( private _service: UserSettingsService, private _path: string ) {
	}

	Get<T>( ContainerID: string ): Rx.IObservable<T> {
		return api.GetRx<T>( Ajax.Get, <UserSettingsGetRequest>{ BucketPath: this._path, ContainerID: ContainerID } );
	}

	Set<T>( ContainerID: string, container: T ): Rx.IObservable<any> {
		return api.PostRx<any>( Ajax.Set, <UserSettingsSetRequest>{ BucketPath: this._path, ContainerID: ContainerID, Container: container });
	}

	Sync<T>( ContainerID: string, anyContainer: any, throttleMilliseconds: number = 2000 ): Rx.IDisposable {
		var values = ko.isObservable( anyContainer ) ? c.koToRx<T>( anyContainer ).skip(1) : <Rx.IObservable<T>>anyContainer;

		return values
			.throttle( throttleMilliseconds )
			.selectMany( value => this.Set( ContainerID, value ).takeUntil( values ) )
			.catchException( e => { console.error( e ); return rx.Observable.empty<any>(); } )
			.repeat()
			.subscribe();
	}

	Nest( bucketKey: string ): IUserSettingsBucket {
		return new Bucket( this._service, this._path + ( this._path ? "." : "" ) + bucketKey );
	}
}
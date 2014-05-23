/// <reference path="../../../../lib/rx/rx.d.ts" />

declare module Rx {
	var DOM: {
		fromEvent( element: Element, event: string ): Rx.IObservable<Event>;
		fromEvent( element: Document, event: string ): Rx.IObservable<Event>;
		fromEvent( element: Window, event: string ): Rx.IObservable<Event>;
	};
}
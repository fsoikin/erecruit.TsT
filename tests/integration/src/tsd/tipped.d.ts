interface TippedOptions {
	// TODO: [fs] this is incomplete. I'm adding properties as needed.
	ajax?: any;

	skin?: string;
	fixed?: boolean;
	closeButton?: boolean;
	hook?: string;
	target?: string;

	showDelay?: number;

	hideOn?: any;
	showOn?: any;
	hideOthers?: boolean;

	onShow?: () => void;
	onHide?: () => void;
}

interface TippedStatic {
	findElement(tooltipOrAnyChild: Element): Element;
	get(e: Element): TippedCollection;
	get(cssSelector: string): TippedCollection;
	
	create(e: Element, content: Element, options?: TippedOptions): TippedCollection;
	create( e: Element, content: string, options?: TippedOptions): TippedCollection;
	create( cssSelector: string, options?: TippedOptions): TippedCollection;

	remove(e: Element): TippedCollection;
	remove(cssSelector: string): TippedCollection;

	hideAll(): void;

	show(e: Element): void;
	hide(e: Element): void;
	toggle(e: Element): void;
	refresh(e: Element): void;
}

interface TippedCollection {
	show(): TippedCollection;
	hide(): TippedCollection;
	toggle(): TippedCollection;
	refresh(): TippedCollection;
	remove(): TippedCollection;
}

declare var Tipped: TippedStatic;
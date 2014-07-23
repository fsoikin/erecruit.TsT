export interface I { }

export class BaseClass implements I { }

export class TheClass extends BaseClass {
	constructor( x: number );
	constructor( y: string );
	constructor( y: any ) { super(); }
}
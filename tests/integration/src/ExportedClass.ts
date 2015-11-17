export interface I { }

/** @MakeRef true */
export class BaseClass implements I { }

/** @MakeRef true */
export class TheClass extends BaseClass {
	constructor( x: number );
	constructor( y: string );
	constructor( y: any ) { super(); }
}
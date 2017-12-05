export interface Range<T> {
	Start: T;
	End: T;
}

export interface Range<T> {
	Another: string;
}

export enum Colors {
	Red, Green, Blue
}

export interface Point {
	X: number; Y: number;
}

export interface Square {
	Center: Point;
	Size: number;
}

export class Cls {
	constructor( a: number );
	constructor( b: string );
	constructor( x: any ) { }
}

export var a = 0;
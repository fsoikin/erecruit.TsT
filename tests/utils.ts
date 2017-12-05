/// <reference path="../typings/index.d.ts" />
import * as path from "path"
import * as fs from "fs"
import * as Enumerable from 'linq-es2015'
import { suppressOutput } from '../src/utils'
import * as nunjucks from 'nunjucks'

var groupStack: string[] = [];
var fns = ["it", "fit", "xit"];
var real = fns.reduce( (x, fn) => { x[fn] = global[fn]; return x; }, {} );
var override = () => fns.forEach( fn =>
	global[fn] = ( name: string, define: () => void ) => {
		restore();
		real[fn]( groupStack.join( ' ' ) + ' ' + name, define );
		override();
	} );
var restore = () => fns.forEach( fn => global[fn] = real[fn] );

export function group( name: string, define: () => void ) {
	groupStack.push( name );
	override();
	try {
		define();
	}
	finally {
		restore();
		groupStack.pop();
	}
}

var globalIndent = 0;

suppressOutput();

export function renderTemplate( tpl: string, ctx: any, filters: { [key: string]: (...args: any[]) => any }) {
	var env = new nunjucks.Environment( [] );
	for ( var f in filters ) env.addFilter( f, filters[f] );
	return env.renderString( tpl, ctx );
}
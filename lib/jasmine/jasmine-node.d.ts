/// <reference path="./jasmine.d.ts" />

declare module "jasmine" {
	export = class {
		loadConfigFile( file: string ): void;
		loadConfig( config: JasmineNode.JasmineConfig ): void;
		onComplete( callback: ( passed: boolean ) => void ): void;
		configureDefaultReporter( config: JasmineNode.JasmineDefaultReporterConfig ): void;
		// addReporter( reporter: any ): void;

		execute(specs?: string[], specName?: string): void;
	};
}

declare module JasmineNode {
	export interface JasmineConfig {
		spec_dir: string;
		spec_files: string[];
		helpers: string[];
	}

	export interface JasmineDefaultReporterConfig {
		timer?: jasmine.FakeTimer;
		print?( ...args: any[] ): void;
		showColors?: boolean;
		jasmineCorePath?: string; 
	}
}
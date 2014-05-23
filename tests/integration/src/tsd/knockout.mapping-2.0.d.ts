// Type definitions for Knockout.Mapping 2.0
// Project: https://github.com/SteveSanderson/knockout.mapping
// Definitions by: Boris Yankov <https://github.com/borisyankov/>
// Definitions https://github.com/borisyankov/DefinitelyTyped

/// <reference path="./knockout-2.2.d.ts" />

declare module "ko.mapping" {
	var _: KoMappingStatic;
	export = _;
}

interface KoMappingStatic {
	isMapped( viewModel: any ): boolean;
	fromJS( jsObject: any ): any;
	fromJS( jsObject: any, targetOrOptions: any ): any;
	fromJS( jsObject: any, inputOptions: any, target: any ): any;
	fromJSON( jsonString: string ): any;
	toJS( rootObject: any, options?: Ko.MappingOptions ): any;
	toJSON( rootObject: any, options?: Ko.MappingOptions ): any;
	defaultOptions(): Ko.MappingOptions;
	resetDefaultOptions(): void;
	getType( x: any ): any;
	visitModel( rootObject: any, callback: Function, options?: { visitedObjects?: any; parentName?: string; ignore?: string[]; copy?: string[]; include?: string[]; }): any;
}

declare module Ko {
	interface MappingCreateOptions {
		data: any;
		parent: any;
	}

	interface MappingUpdateOptions {
		data: any;
		parent: any;
		observable: Observable<any>;
	}

	interface MappingOptions {
		ignore?: string[];
		include?: string[];
		copy?: string[];
		mappedProperties?: string[];
		deferEvaluation?: boolean;
		create?: ( options: MappingCreateOptions ) => void;
		update?: ( options: MappingUpdateOptions ) => void;
	}
}
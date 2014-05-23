declare function define( dependencies: string[], run: Function): void;
declare function define( moduleName: string, dependencies: string[], run: Function ): void;
declare var require: {
	( dependencies: string[], run?: Function ): void;
	( dependency: string ): any;
	config( options: any ): void;
};
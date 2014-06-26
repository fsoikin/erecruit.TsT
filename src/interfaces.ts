module erecruit.TsT {
	export interface ITsTHost {
		FetchFile( fileName: string ): string;
		ResolveRelativePath( path: string, directory: string ): string;
		MakeRelativePath( from: string, to: string ): string;
		DirectoryExists( path: string ): boolean;
		GetParentDirectory( path: string ): string;
		GetIncludedTypingFiles(): string[];
	}

	export interface Document {
		Path: string;
		Classes: Class[];
		Types: Type[];
	}

	export enum ModuleElementKind { Class = 0, Type = 1 }

	export interface Declaration {
		Comment: string;
		Directives: { [name: string]: string };
	}

	export interface ModuleElement extends Declaration {
		Document: Document;
		ExternalModule: string;
		InternalModule: string;
		Kind: ModuleElementKind;
	}

	export interface Class extends ModuleElement {
		Name: string;
		PrimaryInterface: Type;
		BaseClass: () => Class;
		Implements: Type[];
		GenericParameters?: Type[];
		Constructors: CallSignature[];
	}

	// This is supposed to be a type union, but alas, we don't have those in TS yet
	export interface Type extends ModuleElement {
		PrimitiveType?: PrimitiveType;
		Enum?: () => Enum;
		Interface?: () => Interface;
		GenericParameter?: () => GenericParameter;
		GenericInstantiation?: () => GenericInstantiation;
		Array?: () => Type;
	}

	export interface GenericInstantiation {
		Definition: Type;
		Arguments: Type[];
	}

	export enum PrimitiveType {
		Any = 0, String = 1, Boolean = 2, Number = 3
	}

	export interface GenericParameter {
		Name: string;
		Constraint: Type;
	}

	export interface Enum {
		Name: string;
		Values: { Name: string; Value: number; }[]
	}

	export interface Interface {
		Name: string;
		Extends: Type[];
		GenericParameters: Type[];
		Properties: Identifier[];
		Methods: Method[];
	}

	export interface Method {
		Name: string;
		Signatures: CallSignature[];
	}

	export interface Identifier extends Declaration {
		Name: string;
		Type: Type;
	}

	export interface CallSignature extends Declaration {
		GenericParameters: Type[];
		Parameters: Identifier[];
		ReturnType?: Type;
	}
}
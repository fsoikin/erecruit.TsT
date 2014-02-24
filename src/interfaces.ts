module TsT {
	export interface Module {
		Classes: Class[];
		Types: Type[];
	}

	export enum PrimitiveType {
		Any, String, Boolean, Number
	}

	// This is supposed to be a type union, but alas, we don't have those in TS yet
	export interface Type {
		PrimitiveType?: PrimitiveType;
		Enum?: Enum;
		Interface?: Interface;
		GenericParameter?: GenericParameter;
	}

	export function typeName( t: Type ) {
		return ( t.Enum && t.Enum.Name )
			|| ( t.GenericParameter && t.GenericParameter.Name )
			|| ( t.Interface && t.Interface.Name )
			|| ( t.PrimitiveType && PrimitiveType[t.PrimitiveType] );
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

	export interface Identifier {
		Name: string;
		Type: Type;
	}

	export interface CallSignature {
		GenericParameters?: Type[];
		Parameters: Identifier[];
	}

	export interface Class {
		Name: string;
		Implements: Type[];
		GenericParameters?: Type[];
		Constructors: CallSignature[];
	}
}
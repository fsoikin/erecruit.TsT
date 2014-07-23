// This is the typings file for Nunjucks, a JS templating engine.
// For more info, see http://mozilla.github.io/nunjucks/api.html

declare module nunjucks {
	var Environment: {
		new ( loaders: Nunjucks.ILoader[], options?: { autoescape?: boolean; tags?: Nunjucks.TagsOptions } ): Nunjucks.IEnvironment;
	}

	var Template: {
		new ( src: string, env?: Nunjucks.IEnvironment, path?: string, eagerCompile?: boolean ): Nunjucks.ITemplate;
	}

	var FileSystemLoader: {
		new (): Nunjucks.ILoader;
	}

	var render: Nunjucks.RenderFunc<string>;
	var renderString: Nunjucks.RenderFunc<string>;
}

declare module Nunjucks {
	interface IEnvironment {
		render: RenderFunc<string>;
		renderString: RenderFunc<string>;

		addFilter( name: string, func: Function, async?: boolean ): void;
		getFilter( name: string ): Function;

		addExtension( name: string, ext: IExtension ): void;
		getExtension( name: string ): IExtension;

		getTemplate( name: string, eagerCompile?: boolean ): ITemplate;
		getTemplate( name: string, callback: ( err: any, res: ITemplate ) => void ): void;
		getTemplate( name: string, eagerCompile: boolean, callback: (err: any, res: ITemplate) => void ): void;
	}

	interface ITemplate {
		render( context?: any ): string;
		render( callback: ( err: string, res: string ) => void ): void;
		render( context: any, callback: ( err: string, res: string ) => void ): void;
	}

	interface RenderFunc<TInput> {
		( input: string, context?: any ): string;
		( input: string, callback: ( err: string, res: string ) => void ): void;
		( input: string, context: any, callback: (err: string, res: string) => void ): void;
	}

	interface ILoader {
		async?: boolean;
		getSource( name: string ): { src: string; path: string };
		getSource( name: string, callback?: ( err: any, result: { src: string; path: string } ) => void ): void;
	}

	interface TagsOptions {
		blockStart: string;
		blockEnd: string;
		variableStart: string;
		variableEnd: string;
		commentStart: string;
		commentEnd: string;
	}

	interface IExtension {
		tags: string[];
		parse( parser: Parser.IParser, nodes: Parser.Nodes, lexer: Parser.ILexer ): void;
	}

	module Parser {
		interface IParser {
			nextToken(): IToken;
			advanceAfterBlockEnd( currentTokenValue?: string ): void;
		}

		interface ILexer {
		}

		interface IToken {
			value: string;
		}

		interface INode {
		}

		interface INodeList extends INode {
		}

		interface Nodes {
			CallExtension: { new ( obj: any, func: string, args: INodeList, contentArgs: any[] ): INode };
			Literal: _SimpleNode;
			Output: _SimpleNode;
		}

		interface _SimpleNode {
			new ( lineno: number, colno: number, value: string ): INode;
		}
	}
}
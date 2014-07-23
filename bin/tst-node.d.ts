/// <reference path="../lib/nunjucks/nunjucks.d.ts" />
/// <reference path="../lib/linq/linq.d.ts" />
/// <reference path="../lib/typescript/typescript.d.ts" />
/// <reference path="../lib/rx/rx.d.ts" />
declare module "tst" {
    interface ITsTHost {
        FetchFile(fileName: string): string;
        ResolveRelativePath(path: string, directory: string): string;
        MakeRelativePath(from: string, to: string): string;
        DirectoryExists(path: string): boolean;
        GetParentDirectory(path: string): string;
        GetIncludedTypingFiles(): string[];
    }
    interface Document {
        Path: string;
        Classes: Class[];
        Types: Type[];
    }
    enum ModuleElementKind {
        Class = 0,
        Type = 1,
    }
    interface Declaration {
        Comment: string;
        Directives: {
            [name: string]: string;
        };
    }
    interface ModuleElement extends Declaration {
        Document: Document;
        ExternalModule: string;
        InternalModule: string;
        Kind: ModuleElementKind;
    }
    interface Class extends ModuleElement {
        Name: string;
        PrimaryInterface: Type;
        BaseClass: () => Class;
        Implements: Type[];
        GenericParameters?: Type[];
        Constructors: CallSignature[];
    }
    interface Type extends ModuleElement {
        PrimitiveType?: PrimitiveType;
        Enum?: () => Enum;
        Interface?: () => Interface;
        GenericParameter?: () => GenericParameter;
        GenericInstantiation?: () => GenericInstantiation;
        Array?: () => Type;
    }
    interface GenericInstantiation {
        Definition: Type;
        Arguments: Type[];
    }
    enum PrimitiveType {
        Any = 0,
        String = 1,
        Boolean = 2,
        Number = 3,
    }
    interface GenericParameter {
        Name: string;
        Constraint: Type;
    }
    interface Enum {
        Name: string;
        Values: {
            Name: string;
            Value: number;
        }[];
    }
    interface Interface {
        Name: string;
        Extends: Type[];
        GenericParameters: Type[];
        Properties: Identifier[];
        Methods: Method[];
    }
    interface Method {
        Name: string;
        Signatures: CallSignature[];
    }
    interface Identifier extends Declaration {
        Name: string;
        Type: Type;
    }
    interface CallSignature extends Declaration {
        GenericParameters: Type[];
        Parameters: Identifier[];
        ReturnType?: Type;
    }

    interface ConfigPart {
        [regex: string]: {
            FileName: string;
            Template: string;
        };
    }
    interface FileConfig {
        Classes?: ConfigPart;
        Types?: ConfigPart;
    }
    interface Config extends FileConfig {
        RootDir?: string;
        ConfigDir?: string;
        IncludedTypingFiles?: string[];
        Files?: {
            [regex: string]: FileConfig;
        };
    }
    interface CachedConfigPart {
        match: (name: string) => boolean;
        fileName: Nunjucks.ITemplate;
        template: Nunjucks.ITemplate;
    }
    interface CachedFileConfig {
        Match: (fileName: string) => boolean;
        Types: CachedConfigPart[];
        Classes: CachedConfigPart[];
    }
    interface CachedConfig {
        Original: Config;
        Host: ITsTHost;
        File: CachedFileConfig[];
        NunjucksEnv: Nunjucks.IEnvironment;
    }
    function getFileConfigTypes(config: CachedConfig, fileName: string): CachedConfigPart[];
    function getFileConfigClasses(config: CachedConfig, fileName: string): CachedConfigPart[];
    function cacheConfig(host: ITsTHost, config: Config): CachedConfig;

    function ensureArray<T>(a: T[]): T[];
    function objName(e: ModuleElement, safe?: boolean): any;
    function merge(...hashes: any[]): any;
    function log(msg: () => string): void;
    function debug(msg: () => string): void;

    interface ExtractorOptions {
        UseCaseSensitiveFileResolution?: boolean;
    }
    class Extractor {
        private _config;
        private _options;
        constructor(_config: CachedConfig, _options?: ExtractorOptions);
        public LoadDocuments(docs: string[]): void;
        private addFile(f);
        public GetDocument(fileName: string): Document;
        private GetClass(ctor);
        private GetCachedDoc(path);
        private GetCachedDocFromDecl(d);
        private GetCachedDocFromSymbol(s);
        private GetInternalModule(d);
        private GetExternalModule(d);
        private GetType(type);
        private IsGenericInstantiation(type);
        private GetGenericInstantiation(type);
        private GetCallSignature(s);
        private GetPrimitiveType(type);
        private GetImplemented(type, includeExtended?);
        private GetBaseClass(type);
        private GetInterface(type);
        private GetEnum(type);
        private GetDocumentForDecl(d);
        private GetGenericParameter(type);
        private EnsureResolved(s);
        private SymbolFromDecl;
        private _compiler;
        private _typeCache;
        private _docCache;
        private _snapshots;
        private normalizePath(path);
        private _tsHost;
        private rootRelPath(realPath);
        private realPath(pathRelativeToRoot);
    }

    function markupFilters(config: CachedConfig): {
        [key: string]: Function;
    };
    class DummyTagExtension implements Nunjucks.IExtension {
        public tags: string[];
        public parse(parser: Nunjucks.Parser.IParser, nodes: Nunjucks.Parser.Nodes, lexer: Nunjucks.Parser.ILexer): Nunjucks.Parser.INode;
    }

    function markupFilters(config: CachedConfig): {
        [key: string]: Function;
    };

    interface FileContent {
        OutputFile: string;
        Content: string;
        SourceFiles: string[];
    }
    function Emit(cfg: Config, files: string[], host: ITsTHost): FileContent[];

    var Version: string;
}

/// <reference path="../lib/linq/linq.d.ts" />
/// <reference path="../lib/dust/dust.d.ts" />
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
    interface Module {
        Path: string;
        Classes: Class[];
        Types: Type[];
    }
    enum ModuleElementKind {
        Class = 0,
        Type = 1,
    }
    interface ModuleElement {
        Module: Module;
        InternalModule: string;
        Kind: ModuleElementKind;
    }
    interface Class extends ModuleElement {
        Name: string;
        Implements: Type[];
        GenericParameters?: Type[];
        Constructors: CallSignature[];
    }
    interface Type extends ModuleElement {
        PrimitiveType?: PrimitiveType;
        Enum?: Enum;
        Interface?: Interface;
        GenericParameter?: GenericParameter;
        Array?: Type;
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
    interface Identifier {
        Name: string;
        Type: Type;
    }
    interface CallSignature {
        GenericParameters?: Type[];
        Parameters: Identifier[];
        ReturnType?: Type;
    }
    function typeName(e: ModuleElement): string;

    interface ConfigPart {
        [regex: string]: {
            FileName: string;
            Template: string;
        };
    }
    interface FileConfig {
        Class?: ConfigPart;
        Types?: ConfigPart;
    }
    interface Config extends FileConfig {
        Extension?: string;
        RootDir?: string;
        ConfigDir?: string;
        IncludedTypingFiles?: string[];
        File?: {
            [regex: string]: FileConfig;
        };
    }
    interface CachedConfigPart {
        match: (name: string) => boolean;
        fileName: dust.RenderFn;
        template: dust.RenderFn;
    }
    interface CachedConfig {
        Original: Config;
        Host: ITsTHost;
        File: {
            match: (fileName: string) => boolean;
            types: CachedConfigPart[];
        }[];
    }
    function getFileConfig(config: CachedConfig, fileName: string): CachedConfigPart[];
    function cacheConfig(host: ITsTHost, config: Config): CachedConfig;

    interface ExtractorOptions {
        UseCaseSensitiveFileResolution?: boolean;
    }
    class Extractor {
        private _config;
        private _options;
        constructor(_config: CachedConfig, _options?: ExtractorOptions);
        private addFile(f);
        public GetModule(fileName: string): Module;
        private GetInternalModule(d);
        private GetType;
        private GetCallSignature;
        private GetPrimitiveType(type);
        private GetBaseTypes;
        private GetInterface;
        private GetEnum(type);
        private GetDocumentForDecl(d);
        private GetGenericParameter(mod, type);
        private EnsureResolved(s);
        private _compiler;
        private _typeCache;
        private _snapshots;
        private normalizePath(path);
        private _tsHost;
    }

    module Config {
        function fromDustContext(context: dust.Context): CachedConfig;
        function toDustContext(config: CachedConfig): dust.Context;
    }
    interface FileContent {
        OutputFile: string;
        Content: string;
        SourceFiles: string[];
    }
    function Emit(cfg: Config, files: string[], host: ITsTHost): Rx.IObservable<FileContent>;

}

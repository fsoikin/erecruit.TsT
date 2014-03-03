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
    enum PrimitiveType {
        Any = 0,
        String = 1,
        Boolean = 2,
        Number = 3,
    }
    interface Type {
        Module: Module;
        PrimitiveType?: PrimitiveType;
        Enum?: Enum;
        Interface?: Interface;
        GenericParameter?: GenericParameter;
        Array?: Type;
    }
    function typeName(t: Type): string;
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
    }
    interface Class {
        Name: string;
        Implements: Type[];
        GenericParameters?: Type[];
        Constructors: CallSignature[];
    }

    interface ConfigPart {
        [regex: string]: {
            FileName: string;
            Template: string;
        };
    }
    interface FileConfig {
        Class?: ConfigPart;
        Type?: ConfigPart;
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
    interface CachedFileConfig {
        Class: CachedConfigPart[];
        Type: CachedConfigPart[];
    }
    interface CachedConfig {
        Original: Config;
        Host: ITsTHost;
        File: {
            match: (fileName: string) => boolean;
            config: CachedFileConfig;
        }[];
    }
    function getFileConfig(config: CachedConfig, fileName: string): CachedFileConfig;
    function cacheConfig(host: ITsTHost, config: Config): CachedConfig;

    interface ExtractorOptions {
        UseCaseSensitiveFileResolution?: boolean;
    }
    class Extractor {
        private _host;
        private _options;
        constructor(_host: ITsTHost, _options?: ExtractorOptions);
        private addFile(f);
        public GetModule(fileName: string): Module;
        private GetType;
        private GetCallSignature;
        private GetPrimitiveType(type);
        private GetBaseTypes;
        private GetInterface;
        private GetEnum(type);
        private GetDocumentForDecl(d);
        private GetMethod;
        private GetGenericParameter(mod, type);
        private EnsureResolved(s);
        private _compiler;
        private _typeCache;
        private _snapshots;
        private _tsHost;
    }

    module Config {
        function fromDustContext(context: dust.Context): CachedConfig;
        function toDustContext(config: CachedConfig): dust.Context;
    }
    interface FileContent {
        SourceFile: string;
        OutputFile: string;
        Content: string;
    }
    function Emit(cfg: Config, files: string[], host: ITsTHost): Rx.IObservable<FileContent>;

}

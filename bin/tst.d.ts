/// <reference path="../lib/linq/linq.d.ts" />
/// <reference path="../lib/typescript/typescript.d.ts" />
/// <reference path="../lib/dust/dust.d.ts" />
/// <reference path="../lib/rx/rx.d.ts" />
declare module TsT {
    interface ConfigPart {
        [regex: string]: string;
    }
    interface FileConfig {
        Class?: ConfigPart;
        Type?: ConfigPart;
    }
    interface Config extends FileConfig {
        Extension?: string;
        RootDir?: string;
        File?: {
            [regex: string]: FileConfig;
        };
    }
    interface CachedConfigPart<TTemplate> {
        match: (name: string) => boolean;
        template: TTemplate;
    }
    interface CachedFileConfig<TTemplate> {
        Class: CachedConfigPart<TTemplate>[];
        Type: CachedConfigPart<TTemplate>[];
    }
    interface CachedConfig<TTemplate> {
        Original: Config;
        File: {
            match: (fileName: string) => boolean;
            config: CachedFileConfig<TTemplate>;
        }[];
    }
    function getFileConfig<TTemplate>(config: CachedConfig<TTemplate>, fileName: string): CachedFileConfig<TTemplate>;
    function cacheConfig<TTemplate>(config: Config, resolveTemplate: (str: string) => TTemplate): CachedConfig<TTemplate>;
}
declare module TsT {
    interface Module {
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
        PrimitiveType?: PrimitiveType;
        Enum?: Enum;
        Interface?: Interface;
        GenericParameter?: GenericParameter;
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
}
declare module TsT {
    interface ITsTHost {
        FetchFile(fileName: string): string;
        ResolveRelativePath(path: string, directory: string): string;
        DirectoryExists(path: string): boolean;
        GetParentDirectory(path: string): string;
    }
    interface ExtractorOptions {
        UseCaseSensitiveFileResolution?: boolean;
    }
    class Extractor implements TypeScript.IReferenceResolverHost {
        private _host;
        private _options;
        constructor(_host: ITsTHost, _options?: ExtractorOptions);
        public GetModule(fileName: string): TsT.Module;
        private GetType;
        private GetCallSignature;
        private GetPrimitiveType(type);
        private GetBaseTypes(type);
        private GetInterface(type);
        private GetEnum(type);
        private GetMethod(type);
        private GetGenericParameter(type);
        private EnsureResolved(s);
        private _compiler;
        private _typeCache;
        private _snapshots;
        public getScriptSnapshot(fileName: string): TypeScript.IScriptSnapshot;
        public resolveRelativePath(path: string, directory: string): string;
        public fileExists(path: string): boolean;
        public directoryExists(path: string): boolean;
        public getParentDirectory(path: string): string;
    }
}
declare module TsT {
    interface File {
        FullPath: string;
        Directory: string;
        RelativeDir: string;
        Name: string;
        NameWithoutExtension: string;
        Extension: string;
    }
    interface FileContent {
        File: File;
        Content: string;
    }
    function Emit(cfg: Config, files: File[], host: ITsTHost): Rx.IObservable<FileContent>;
}

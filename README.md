TsT
===

erecruit TypeScript Translator: parse type information out of TypeScript files and generate other files (e.g. in another language) based on it.

The primary intended use for this tool is generating server-side data transfer objects in strongly typed languages, such as C#.

1. [Basics](#basics)
2. [Configuration file](#config)
3. [Templates and the simplified AST data structure](#templates)
4. [Types vs Classes](#typesclasses)
5. [TsT-specific dust.js helpers](#helpers)


#<a name="basics"></a>Basics
erecruit TS Translator does not have a hard-coded way to generate code based on TypeScript-extracted type information. Instead, it uses user-defined templates for that purpose. The templates are rendered using the [dust.js template engine](http://linkedin.github.io/dustjs/), which is light, sufficiently powerful, and, unlike most modern JavaScript template engines, not focused on HTML.

erecruit.TsT uses the [Typescript](http://typescriptlang.org) compiler to pull type information from the source TypeScript files, generates a simplified AST in the form of JavaScript data structure (object tree), and then feeds that data structure to dust.js, which ultimately produces the resulting code.

<img src="https://raw.githubusercontent.com/erecruit/TsT/master/doc/diagram.png"/>

There are three ways to run TsT:

1. Node.js console program (found in bin/tstc.js)
2. .NET console program (in bin/dotNet/tstc.exe)
3. [Visual Studio extension](https://github.com/erecruit/TsT/tree/master/dotNet/vs) (in bin/tst.vsix)

#<a name="config"></a>Configuration file
erecruit.TsT has a configuration file (usually named .tstconfig) to help make a few important decisions, such as which types and files should be translated and what templates to use for them.

The config file can be either specified explicitly via a command-line parameter (not supported in VS extension) or automatically discovered individually for each source file by traversing the filesystem from the file up the directory tree until .tstconfig is found (much like [.gitignore](http://git-scm.com/docs/gitignore) works).

The config file format is the following:

```JavaScript
{
    // The directory to be used as origin for relative paths.
    // If this path is not absolute, it is assumed relative to the
    // directory of the config file itself.
    // optional; default is '.'
    RootDir: '../../js', 

    // Typing files to be implicitly included with the compilation.
    // If you have typings referenced with a ///<reference> directive
    // within your TypeScript files, these do not have to be included here
    // The standard lib.d.ts also does not have to be included.
    // The paths of typings are relative to RootDir (see above).
    // optional
    IncludedTypingFiles: [ '../typings/jQuery.d.ts', '../typings/knockout.d.ts' ],

    // Map of type names to their configurations.
    // (see also "Types vs Classes" below)
    // This allows to have [potentially] different configurations
    // for different types. Keys of the map are regular expressions.
    // Because it is possible for several regular expressions to match
    // the same type, some types may end up having several
    // configurations. This situation is allowed and supported.
    // optional
    Types: {
        'regex': {

            // Name of output file to which the generated result
            // will be written. This string is actually a dust.js
            // template with allowed properties: {Path}, {Name}, {Extension},
            // which refer to the source file.
            // When multiple types end up targeted to the same
            // output file, their contents are simply concatenated.
            // REQUIRED
            FileName: '{Path}/{Name}.cs',
                    
            // The actual template to be used for rendering the type.
            // Normally, the string is treated as the template itself.
            // If the string starts with the '@' symbol, then the rest
            // of it is treated as the path to a file (relative to RootDir)
            // from which the template should be loaded.
            // The same '@' convention also works for FileName (above).
            // REQUIRED
            Template: '@./templates/type.cs.tpl'
        }
    },

    // Map of class names to their configurations.
    // (see Types vs Classes below)
    // Works the same way as the Types map.
    Classes: {
        '.': {
            FileName: '{Path}/{Name}.cs',
            Template: '@./templates/class.cs.tpl'
        }
    }

    // Map of source file names to their configurations.
    // This works the same way as the Types and Classes map -
    // i.e. keyed by regular expressions, collisions allowed.
    // Each entry has the same two 'Types' and 'Classes'
    // substructures as those described above.
    // This section allows to override the configuration for
    // specific files or files matching specific patterns.
    // optional
    Files: {
        'legacy/.*\.ts$': {
           Types: {
               FileName: '{Path}/{Name}.cs',
               Template: '@./templates/legacy.type.cs.tpl'
           }
        }
    }
}
```

#<a name="templates"></a>Templates and the simplified AST data structure
When a type (or class) template is rendered, its root context is set to a data structure that represents the type.

The format of that structure for Type (can be found in src/interfaces.ts):

```JavaScript
// Note that this data structure is recursive. For example,
// the GenericInstantiation option contains a reference
// to another Type data structure, as do many others.
{
    // The TypeScript module (i.e. file) from which this type came
    Module: {
        Path: 'path/to/the/module.ts', // Relative to RootDir in config file
        Classes: [ /* all classes in this module */ ],
        Types: [ /* all types in this module */ ]
    },
    
    // If the type is nested in an internal module (in TS sense),
    // this is that module's full name
    InternalModule: 'Ts.Module.Name',

    Kind: 1,  // 0 for class, 1 for type
 
    // *******************************************************************
    // The following substructures represent the different breeds
    // of types that exist in TypeScript. Only one of these will be
    // actually present.
    // *******************************************************************

    PrimitiveType: 0,  // 0 = any, 1 = string, 2 = boolean, 3 = number

    Enum: {
        Name: 'SomeEnum',
        Values: [ { Name: 'A', Value: 0 }, { Name: 'B', Value: 1 } ]
    },

    GenericParameter: {
        Name: 'T',
        Constraint: { /* data structure representing another Type */ }
    },

    GenericInstantiation: {
        Definition: { /* a data structure representing an Interface (see below) */ },
        Arguments: [ /* an array of Types */ ]
    },

    Array: { /* another Type, representing the array element */ }

    Interface: {
        Name: 'SomeObject',
        Extends: [ /* array of Types */ ],
        GenericParameters: [ /* array of Types */ ],
        Properties: [ 
            { Name: 'x', Type: { /* another Type */ } },
            { Name: 'y', Type: { /* another Type */ } } 
        ],
        Methods: [
            { 
                Name: 'method', 
                Signatures: [
                    {
                        GenericParameters: [ /* array of Types */ ],
                        Parameters: [ 
                            { Name: 'x', Type: { /* another Type */ } },
                            { Name: 'y', Type: { /* another Type */ } } 
                        ],
                        ReturnType: { /* another type */ }
                    }
                ]
            }
        ]
    }
}
```

#<a name="helpers"></a>TsT-specific Dust.js helpers

##General Helpers

###replace
Replaces a substring with another using regular expression.

|Parameters:| |
|----|----|
| **str** | input string|
| **regex** | regular expression to test against|
| **replacement** | replacement string. Can include regular JavaScript named and numbered references like $1, $2, $myGroup, etc.|

```
   {@replace str="{Name}" regex="-" replacement="_" /}
```

###test
Executes the inside block when the given string matches given regex, otherwise executes the `:else` block.

```
   {@test str="{Name}" regex="^I"}
      interface
   {:else}
      class
   {/test}
```


###typeName
Renders the name of the current type.<br/>
*Current context* must be the type object itself.

```
   // Rendering type {@typeName /}, defined in {Module.Path}
   public interface ...
```


###indent
Renders an sequence of one or more TAB characters.

|Parameters:| |
|----|----|
|**count** *(optional)*| the number of TAB characters to render. Default is 1.|

```
   {@indent}
   public interface {@typeName/} { {~n}
      {@indent count=2}
      {#Properties} ... {/Properties}
```

###whenType and whenClass
Render the inside block when the current entry is a Type or a Class (respectively). Otherwise, renders the `:else` block.

##C# Helpers

###cs_typeName
Generates the local name of the type (not including namespace). Takes care of the primitive types, mapping them correctly to the .NET analogs.
*Current context* must be the type object itself.

```
   public interface {@cs_typeName/} {
      ...
   }
```


###cs_typeFullName
Generates full name of the type (same as previous, but including namespace when necessary).
*Current context* must be the type object itself.

```
   {#Properties}
      public {#Type}{@cs_typeFullName/}{/Type} {Name} { get; set; }
   {/Properties}
```


###cs_typeNamespace
Generates namespace of the type from the path of the file. File name itself is not included in the namespace. For example, namespace for all types in *js/src/xyz.ts* will be *js.src*.
*Current context* must be the type object itself.

```
    namespace MyApp.{@cs_typeNamespace} {
       ...
    }
```


###cs_whenEmptyNamespace
Executes the inside block when the current type's namespace is empty (i.e. it comes from a file that is located in the root directory), or the `:else` block otherwise.
*Current context* must be the type object itself.

```
   namespace MyApp
      {! Append a dot, but only when the namespace is not empty !}
      {@cs_whenEmptyNamespace}{:else}.{/cs_whenEmptyNamespace}

      {! Then append the namespace itself }
      {@cs_typeNamespace/}
```

##File System Helpers

###fs_fileNameWithoutExtension
Given a path, renders the name of the file without extension.

|Parameters:| |
|----|----|
| **path** | the path out of which to parse the file name.|

```
   // This type was defined in the module {@fs_fileNameWithoutExtension path="{Module.Path}" /}
   public interface ...
```

###fs_relativePath
Given two paths, "from" and "to", renders a relative path which would lead from the former to the latter.

|Parameters:| |
|----|----|
| **from** | starting path |
| **to** | destination path |

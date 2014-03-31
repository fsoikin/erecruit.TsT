TsT
===

erecruit TypeScript Translator: parse type information out of TypeScript files and generate other files (e.g. in another language) based on it.

The primary intended use for this tool is generating server-side data transfer objects in strongly typed languages, such as C#.

1. [Basics](#basics)
2. [Configuration file](#config)
3. [Templates](#templates)
4. [TsT-specific dust.js helpers](#helpers)


#<a name="basics"></a>Basics
erecruit TS Translator does not have a hard-coded way to generate code based on TypeScript-extracted type information. Instead, it uses user-defined templates for that purpose. The templates are rendered using the [dust.js template engine](http://linkedin.github.io/dustjs/), which is light, sufficiently powerful, and, unlike most modern JavaScript template engines, not focused on HTML.


#<a name="helpers"></a>Dust.js helpers

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

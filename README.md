TsT
===

erecruit TypeScript Translator: parse type information out of TypeScript files and generate other files (e.g. in another language) based on it.

The primary intended use for this tool is generating server-side data transfer objects in strongly typed languages, such as C#.

<img src="https://raw.githubusercontent.com/erecruit/TsT/master/doc/screenshot3.png">

1. [Basics](#basics)
2. [Configuration file](#config)
3. [Templates and the simplified AST data structure](#templates)
4. [Types vs Classes](#typesclasses)
5. [TsT-specific Nunjucks extensions](#filters)


#<a name="basics"></a>Basics
erecruit TS Translator does not have a hard-coded way to generate code based on TypeScript-extracted type information. Instead, it uses user-defined templates for that purpose. The templates are rendered using the [Nunjucks templating engine](http://mozilla.github.io/nunjucks/).

erecruit.TsT uses the [Typescript](http://typescriptlang.org) compiler to pull type information from the source TypeScript files, generates a simplified AST in the form of JavaScript data structure (object tree), and then feeds that data structure to Nunjucks, which ultimately produces the resulting code.

<img src="https://raw.githubusercontent.com/erecruit/TsT/master/doc/diagram.png"/>

There are three ways to run TsT:

1. Node.js console program (`npm install erecruit-tst`)
2. .NET console program (in `bin/dotNet/tstc.exe` or compile from `dotNet\tstc\erecruit.TsT.Console.csproj`)
3. [Visual Studio extension](https://github.com/erecruit/TsT/tree/master/dotNet/vs) (available from [Visual Studio Gallery](http://visualstudiogallery.msdn.microsoft.com/c61f8a99-cc0b-4b2e-8913-f00626c92a21) or download from `bin/setup/erecruit.TsT.msi`)

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
						// will be written. This string is actually a Nunjucks
						// template with allowed properties: {{Path}}, {{Name}}, {{Extension}},
						// which refer to the source file. The {{Path}} includes
						// the trailing slash (when not empty). The {{Extension}}
						// does not include the leading dot.
						//
						// When multiple types end up targeted to the same
						// output file, their contents are simply concatenated.
						// REQUIRED
						FileName: '{{Path}}{{Name}}.cs',
										
						// The actual template to be used for rendering the type.
						// Normally, the string is treated as the template itself.
						// If the string starts with the '@' symbol, then the rest
						// of it is treated as the path to a file (relative to the 
						// config file itself).
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
						FileName: '{Path}{Name}.cs',
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
							 FileName: '{Path}{Name}.cs',
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
		// The TypeScript document (i.e. file) from which this type came
		Document: {
				Path: 'lib/path/to/file.ts', // Relative to RootDir in config file
				Classes: [ /* all classes in this document */ ],
				Types: [ /* all types in this document */ ]
		},

		// Name of the module as it appears for external inclusion (i.e. require() call)
		// External module name usually matches the file name (or path),
		// but not always. The exception is explicitly declared external
		// modules residing in .d.ts files. For example, if the file tsd/jQuery.d.ts
		// contains the declaration of "declare module "jQuery" { ... }", then
		// Document.Path will be tsd/jQuery.d.ts, but ExternalModule will
		// be "jQuery".
		// Note the double quotes around the module name. This is not a typo,
		// this is how TypeScript names external modules.
		ExternalModule: '"lib/path/to/file.ts"',

		// Alternatively:
		// ExternalModule: '"jQuery"',
		
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

		Enum: function() => {
				Name: 'SomeEnum',
				Values: [ { Name: 'A', Value: 0 }, { Name: 'B', Value: 1 } ]
		},

		GenericParameter: function() => {
				Name: 'T',
				Constraint: { /* data structure representing another Type */ }
		},

		GenericInstantiation: function() => {
				Definition: { /* a data structure representing another Type */ },
				Arguments: [ /* an array of Types */ ]
		},

		Array: function() => { /* another Type, representing the array element */ }

		Interface: function() => {
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

Note that most members of the `Type` data structure (i.e. `Interface`, `Enum`, etc.) are not plain properties, but functions.
This means that they have to be called within the template in order to get to the data.
It is done this way in order to achieve _laziness_ - that is, types are not parsed and processed unless the template actually requires it.
This gives a significant performance boost, since TypeScript compiler is a rather slow beast.

For example:

```
	{% set intf = Interface() if Interface %}
	{% if intf %}
		public class {{ intf.Name }} {
			...
		}
	{% endif %}
```

Final note: do not be afraid to call the functions multiple times, because they are memoized (that is, the result is cached on the first call and returned from cache on subsequent calls).


#<a name="filters"></a>TsT-specific Nunjucks extensions

##Special "this" variable
A special `this` variable added to Nunjucks (achieved via [monkeypatching](https://github.com/erecruit/TsT/tree/master/src/filters/general.ts#L62)), returns the context object itself.
For example:

```
	namespace {{ namespaceFor( this ) }} {
		public class {{ Name }}{{ genericParametersFor( this ) }}
			...
	}
```

##Whitespace control
Nunjucks has a nice little [feature for whitespace control](http://mozilla.github.io/nunjucks/templating.html#whitespace-control), where one can add a dash to a block's opening/closing brace
to have Nunjucks remove all whitespace on that side of the block. For example, the following template will yield "abc123", even though there some whitespace around "1", "2", and "3" in the template itself:

```
	{{ "abc" }}
	{%- for x in range(1,3) -%}
	{%- endfor -%}
```

However, sometimes it is necessary to eliminate whitespace where there are no blocks to hinge on:

```
	{{ "This should be " }}
	{{ "one line, " }}
	{{ "but it aint" }}
```

This situation could be remedied by introducing a block artificially:

```
	{{ "This will be " }} {%- if false %}{% endif -%}
	{{ "one line. " }}     {%- if false %}{% endif -%}
	{{ "But boy is this ugly!" }}
```

To reduce the noise, TsT defines a special "dummy" block "_" (underscore character). This block does not have a closing tag, making it much less noisy:

```
	{{ "This will be " }}	{%-_-%}
	{{ "one line. " }}		{%-_-%}
	{{ "Still not perfect, but it's a start." }}
```

As a bonus, the "no-whitespace-here" sign now looks like a squinty face :-)


##General Filters

###regexReplace
Replaces a substring with another using regular expression.
This is different from Nunjucks' own [replace](http://mozilla.github.io/nunjucks/templating.html#builtin-filters) filter, because the latter works with plain strings, not regular expressions.

Parameters:
* regular expression to test against
* replacement string. Can include regular JavaScript named and numbered references like $1, $2, $myGroup, etc.
* regular expression flags (optional)

For specification of regular expression language and flags, [see MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp).

```
	 {{ "Some string containing substrings" | regexReplace( "string", "line", "g" ) }} {# will yield "Some line containing sublines" #}
```

###match
Checks if the input matches given regular expression.

Parameters:
* regular expression to test against
* regular expression flags (optional)

```
	 {% if Name | match( "^I" ) %}
			interface
	 {% else %}
			class
	 {% endif %}
```


###typeName
Renders the name of a given type.<br/>

Parameters:
* the type

```
	 // Rendering type {{ this | typeName }}, defined in {{ Module.Path }}
	 public interface ...
```


###isType and isClass
Return true if the given object is a type or a class respectively.

Parameters:
* the object to examine

```

	{% if this | isClass %}
		class
	{% elif this | isType %}
		type
	{% else %}
		WTF?!
	{% endif %}

```

##C#-specific Helpers

###cs_typeName
Generates the local name of the type (not including namespace). Takes care of the primitive types, mapping them correctly to the .NET analogs.

Parameters:
* the type


```
	 public interface {{ this | cs_typeName }} {
			...
	 }
```


###cs_typeFullName
Generates full name of the type (same as previous, but including namespace when necessary).

Parameters:
* the type

```
	 {% for p in Properties %}
			public {{ p.Type | cs_typeFullName }} {{ Name }} { get; set; }
	 {% endfor %}
```


###cs_typeNamespace
Generates namespace of the type from the path of the file. File name itself is not included in the namespace. For example, namespace for all types in *js/src/xyz.ts* will be *js.src*.

Parameters:
* the type

```
		namespace MyApp.{{ this | cs_typeNamespace }} {
			 ...
		}
```



##File System-related Helpers

###getFileNameWithoutExtension
Given a path, returns the name of the file without extension.

Parameters:
* the path out of which to parse the file name.

```
	 // This type was defined in the module {{ Module.Path | getFileNameWithoutExtension }}
	 public interface ...
```

###pathRelativeTo
Returns relative path from the input to the argument.

Parameters:
* starting path (i.e. the 'source' path)

```
 {{ "work/abc" | pathRelativeTo("work") }} {# renders "abc" #}
 {{ "work/x/y/z" | pathRelativeTo("work") }} {# renders "x/y/z" #}
 {{ "" | pathRelativeTo("work") }} {# renders ".." #}
```


###dirName
Returns the parent directory of the given file.

```
	{{ "work/x/y/z.ts" | dirName }} {# renders "work/x/y" #}
```
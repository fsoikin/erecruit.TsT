{% macro comment(item) %}
	{%- if item.Comment -%}
		{{ indent() }}/// <summary>{{ item.Comment | regexReplace("[\r\n]+", " ", "g") }}</summary>
	{%- endif -%}
{% endmacro %}


{% macro namespaceName(type) -%}
	{%- set ns = (type | cs_typeNamespace) if not (type.Document.Path | match("^Base")) -%}
	erecruit.JS{{ "." if ns }}{{ ns }}
{%- endmacro %}


{% macro namespace(type) -%}
// {{ type.Document.Path }} 
namespace {{ namespaceName(type) }}
{%- endmacro %}


{%- macro attrs(obj, tabs=1) -%}
	{%- set a = obj.Directives.Attributes -%}
	{%- if a -%} {{ indent(tabs) }}{{ a }} {%- endif -%}
{%- endmacro -%}


{% macro indent(tabs=1) -%}
	{{"\n"}}
	{%- for _ in range(0, tabs) %}{{"\t"}}{% endfor -%}
{%- endmacro %}


{% macro genericParams(typeOrList) %}

	{%- set list = typeOrList -%}
	{%- set list = typeOrList.Arguments if typeOrList.Arguments else list -%}
	{%- set list = typeOrList.GenericParameters if typeOrList.GenericParameters else list -%}

	{%- for a in list -%}
		{{ "<" if loop.first }}{{ typeName(a) }}{{ ">" if loop.last else "," }}
	{%- endfor -%}

{% endmacro %}


{% macro baseTypes(list) %}
		{%- for base in list -%}
			{{ " : " if loop.first }}{{ typeName(base) }}{{ ", " if not loop.last }}
		{%- endfor -%}
{% endmacro %}


{# 
	This macro is needed primarily to handle a bunch of special cases - i.e. we want certain TypeScript-side types
	to be not autogenerated, but rather mapped to pre-existing C#-side types
#}
{% macro typeName(t) -%}

	{%- set intf = t.Interface() if t.Interface -%}
	{%- set enum = t.Enum() if t.Enum -%}
	{%- set array = t.Array() if t.Array -%}
	{%- set inst = t.GenericInstantiation() if t.GenericInstantiation -%}

	{%- if t.Directives.ServerSideType -%}
		{{ t.Directives.ServerSideType }}{{ genericParams( inst ) }}

	{%- elif enum.Name == "AboutType" -%}							erecruit.BL.DataModel.AboutTypes
	{%- elif intf.Name == "AboutObjectId" -%}					erecruit.JS.AboutObjectId
	{%- elif intf.Name == "ClassRef" -%}							erecruit.JS.ClassRef{{ genericParams( inst ) }}
	{%- elif intf.Name == "DateTime" -%}							System.DateTime
	{%- elif intf.Name == "Date" -%}									System.DateTime

	{%- elif inst -%}
		{%- set def = inst.Definition.Interface() -%}

		{%- if def.Name == "IHaveNameAndId" -%}					erecruit.JS.NamedObject
		{%- elif def.Name == "Range" -%}								erecruit.Utils.Range{{ genericParams( inst ) }}
		{%- else -%}																		{{ typeName( inst.Definition ) }}{{ genericParams( inst ) }}

		{%- endif -%}

	{%- elif array.PrimitiveType == 3 -%}							int[]
	{%- elif array -%}																{{ typeName( array ) }}[]

	{%- elif t.PrimitiveType == 3 -%}									int?
	{%- elif t.PrimitiveType == 2 -%}									bool?

	{%- else -%}																			{{t | cs_typeFullName}}
	{%- endif -%}

{%- endmacro %}
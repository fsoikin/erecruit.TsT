{%- from "TsT-Templates/utils.tpl" import comment, namespace, attrs, indent, genericParams, typeName -%}

{% macro propertyDeclaration(p, tabs=2) %}
	{%- set dr = p.Directives -%}
	{%- if not dr.DontTranslate -%}

			{{ attrs(p, tabs) }} {%-_-%}
			{{ defaultValueHandling(p, tabs) }} {%-_-%}
			{{ indent(tabs) }}public {{ dr.ServerSideType if dr.ServerSideType else typeName(p.Type) }}{{ "?" if dr.Nullable }} {{ p.Name }} { get; set; } 

	{%- endif -%}
{% endmacro %}

{% macro defaultValueHandling(dr, tabs) -%}
	{%- set def = dr.DefaultValueHandling -%}
	{%- set nul = dr.NullValueHandling -%}
	{% if def -%}
		{{ indent(tabs) }}[Newtonsoft.Json.JsonProperty(DefaultValueHandling=Newtonsoft.Json.DefaultValueHandling.{{ def }})]
	{%- elif nul %}
		{{ indent(tabs) }}[Newtonsoft.Json.JsonProperty(NullValueHandling=Newtonsoft.Json.NullValueHandling.{{ nul }})]
	{%- endif -%}
{% endmacro %}
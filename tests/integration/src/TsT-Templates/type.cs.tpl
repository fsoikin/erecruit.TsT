{# 
	This is a Nunjucks template.
	For more information about Nunjucks and its usage, see http://mozilla.github.io/nunjucks/templating.html
	For more information about TsT-specific filters, see https://github.com/erecruit/TsT
#}

{%- from "TsT-Templates/utils.tpl" import comment, namespace, attrs, indent, genericParams, typeName, baseTypes -%}
{%- from "TsT-Templates/propertyDeclaration.tpl" import propertyDeclaration -%}

{%- if not Directives.DontTranslate -%}

{%- set intf = Interface() if Interface -%}
{%- set enum = Enum() if Enum -%}

{{ namespace(this) }} {

	{%- if intf.Properties|nonempty -%}
	{{ attrs( this ) }} {%-_-%}
	{{ comment(intf) }} 
	public class {{ intf.Name }}{{ genericParams(intf) }}{{ baseTypes( intf.Extends ) }} {
		{%- for p in intf.Properties -%}
			{{ propertyDeclaration(p) }}
		{%- endfor %}
	}
	{%- endif -%}

	{%- if enum.Values|nonempty %}
	public enum {{ enum.Name }} {
		{%- for v in enum.Values %}
			{{ v.Name }} = {{ v.Value }}{{ "," if not loop.last }}
		{%- endfor %}
	}
	{%- endif %}
}

{% endif %} {# Directives.DontTranslate #}
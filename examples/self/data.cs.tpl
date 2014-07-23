{# 
	This is a Nunjucks template.
	For more information about Nunjucks and its usage, see http://mozilla.github.io/nunjucks/templating.html
	For more information about TsT-specific filters, see https://github.com/erecruit/TsT
#}

{%- set ns = (this|cs_typeNamespace) -%}
{%- set intf = Interface() if Interface -%}
{%- set enum = Enum() if Enum -%}

namespace erecruit.JS{{ "." if ns }}{{ ns }} {

	{%- if intf and (intf.Properties|nonempty) %}
		public class {{ intf.Name }} {
				
			{%- for prop in intf.Properties %}
				public {{ prop.Type | cs_typeFullName }} {{prop.Name}} { get; set; }
			{%- endfor %}
		}
	{%- endif %}

	{%- if enum and (enum.Values|nonempty) %}
		public enum {{enum.Name}} {
			{%- for v in enum.Values %}
				{{v.Name}} = {{v.Value}}{{ "," if not loop.last }}
			{%- endfor %} 
		}
	{%- endif %}

}
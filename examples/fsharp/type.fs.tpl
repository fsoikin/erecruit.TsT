{# 
	This is a Nunjucks template.
	For more information about Nunjucks and its usage, see http://mozilla.github.io/nunjucks/templating.html
	For more information about TsT-specific filters, see https://github.com/erecruit/TsT
#}

{% macro genericParams(list) %}
    {%- for p in list -%}
      {{ "<" if loop.first }}{{ p | fs_typeName }}{{ ">" if loop.last else "," }}
    {%- endfor -%}
{% endmacro %}

{%- set ns = (this|fs_typeNamespace) -%}
{%- set intf = Interface() if Interface -%}
{%- set enum = Enum() if Enum -%}

{%- if intf and (intf.Properties|nonempty) %}
    type {{ intf.Name }}{{ genericParams(intf.GenericParameters) }} = {
      {%- for prop in intf.Properties %}
        {{prop.Name}}: {{ prop.Type | fs_typeFullName }}
      {%- endfor %}
    }
{%- endif %}

{%- if enum and (enum.Values|nonempty) %}
    type {{enum.Name}} =
      {%- for v in enum.Values %}
        | {{v.Name}} = {{v.Value}}
      {%- endfor %} 
{%- endif %}
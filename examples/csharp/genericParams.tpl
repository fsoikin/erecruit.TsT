{% macro genericParams(list) %}
	{%- for p in list -%}
		{{ "<" if loop.first }}{{ p | typeName }}{{ ">" if loop.last else "," }}
	{%- endfor -%}
{% endmacro %}
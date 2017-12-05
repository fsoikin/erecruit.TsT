{# 
	This is a Nunjucks template.
	For more information about Nunjucks and its usage, see http://mozilla.github.io/nunjucks/templating.html
	For more information about TsT-specific filters, see https://github.com/erecruit/TsT
#}

{%- set ns = this | cs_typeNamespace -%}

{# Import path is relative to the config->RootDir (see .tstconfig file) #}
{%- from "csharp/genericParams.tpl" import genericParams -%}

namespace erecruit.JS{{ "." if ns }}{{ ns }} {

	public partial class {{ Document.Path | getFileNameWithoutExtension }}{{ genericParams(GenericParameters) }} {
		{% for c in Constructors %}
			public static string {{this.Name}} (
				{%- for p in c.Parameters -%}
					{{ p.Type | cs_typeFullName }} {{ p.Name }} {{ "," if not loop.last }}
				{%- endfor -%}
			) { return "{{this.Name}}, {{ Document.Path | dirName | pathRelativeTo("") }}{{ Document.Path | getFileNameWithoutExtension }}"; }
		{% endfor %}
	}

}
{# 
	This is a Nunjucks template.
	For more information about Nunjucks and its usage, see http://mozilla.github.io/nunjucks/templating.html
	For more information about TsT-specific filters, see https://github.com/erecruit/TsT
#}

{%- set intf = Interface() if Interface -%}
{%- if intf -%}

namespace erecruit.JS {

	public interface {{intf.Name}} {
		{%- for p in intf.Properties %}
			public {{ intf.Type | cs_typeFullName }} {{ p.Name }} { get; set; }
		{%- endfor -%}

		{%- for m in intf.Methods -%}
			{%- for s in m.Signatures %}
				{{ (s.ReturnType | cs_typeFullName) if s.ReturnType else "void" }} {{m.Name}}(
					{%- for p in s.Parameters -%}
						{{ p.Type | cs_typeFullName }} {{p.Name}} {{ "," if not loop.last }}
					{%- endfor -%}
				);
			{%- endfor -%}
		{%- endfor %}
	}
}

{%- endif -%}
{%- from "TsT-Templates/utils.tpl" import comment, namespace, attrs, indent, genericParams, typeName, baseTypes -%}
{%- from "TsT-Templates/propertyDeclaration.tpl" import propertyDeclaration -%}

{%- set class = this -%}
{%- if Directives.MakeRef -%}

{{ namespace(this) }} {
	public static partial class {{ Document.Path | getFileNameWithoutExtension }} {

		public class {{ Name }}{{ genericParams(this) }}{{ baseTypes( Implements ) }}
		{
			{%- for c in Constructors %}
				public static IClassRef<{{ class.Name }}> Ref{{ genericParams( c ) }} ( 
					{%- for p in c.Parameters -%}
						{%- set intfType = p.Type.Interface() if p.Type.Interface -%}
						{{ "Args" if (p.Type.Interface and not p.Type.Interface().Name) else typeName( p.Type ) }}{{" "}} {%-_-%}
						{{ p.Name }}{{ "," if not loop.last }}
					{%- endfor -%}
				) { 
					return ClassRef.Create<{{ class.Name }}>( {%-_-%}
						"app/{{ class.Document.Path|dirName if class.Document.Path|match("/") }}{{ class.Document.Path | getFileNameWithoutExtension }}", {%-_-%}
						"{{ class.Name }}"
						{%- for p in c.Parameters -%}, {{ p.Name }}{%- endfor -%}
					);
				}

			{%- for p in c.Parameters -%}
				{%- if p.Type.Interface and not p.Type.Interface().Name %}

				public class Args { 
					{%- for prop in p.Type.Interface().Properties -%}
						{{ propertyDeclaration(prop, 5) }}
					{%- endfor %}
				}
				{%- endif -%}
			{%- endfor -%}

			{%- endfor %} {# Constructors #}
		} 
	} 
}

{%- endif -%} {# Directives.MakeRef #}
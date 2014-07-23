{%- from "TsT-Templates/utils.tpl" import comment, namespace, attrs, genericParams, baseTypes -%}

{%- set intf = Interface() if Interface -%}
{%- if not Directives.DontTranslate and intf -%}

{{ namespace(this) }} { {%-_-%}
	{{ attrs( this ) }} {%-_-%}
	{{ comment( this ) }}
	public interface {{ intf.Name }}{{ genericParams(intf) }}{{ baseTypes( intf.Extends ) }} { }
}

{%- endif -%}
{%- from "TsT-Templates/utils.tpl" import comment, namespace, attrs, genericParams, baseTypes -%}

{%- set intf = Interface() if Interface -%}
{%- if not Directives.DontTranslate and (Directives.Attributes|match("UserSettings\\(")) and intf -%}

{{ namespace( this ) }} {
	static partial class UserSettingsMarshal {
		[erecruit.Composition.Export]
		static readonly IUserSettingsJSMarshal {{ intf.Name }} = UserSettingsJSMarshal.Create<{{ intf.Name }}>();
	}
}

{%- endif -%}
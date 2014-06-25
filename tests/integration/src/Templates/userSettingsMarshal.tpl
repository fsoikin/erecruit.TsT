// UserSettingsMarshal {~n}
{^.Directives.skip}
{@test str="{.Directives.Attributes}" regex="UserSettings\("}

	{>"./Templates/namespace.tpl"/}
	{ {~n} 
			{#Interface}
				static partial class UserSettingsMarshal { {~n}
					{@indent/}[erecruit.Composition.Export]
					{@indent/}static readonly IUserSettingsJSMarshal {Name} = UserSettingsJSMarshal.Create<{Name}>();
				}
			{/Interface}
	{~n}
	} {~n}

{/test}
{/.Directives.skip}
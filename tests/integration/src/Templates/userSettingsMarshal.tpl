{^.Directives.skip}

{>"./templates/namespace.tpl"/}
{ {~n} 
	{@test str="{.Directives.Attributes}" regex="UserSettings\("}
		{#Interface}
			static partial class UserSettingsMarshal { {~n}
				{@indent/}[erecruit.Composition.Export]
				{@indent/}static readonly IUserSettingsJSMarshal {Name} = UserSettingsJSMarshal.Create<{Name}>();
			}
		{/Interface}
	{/test}
{~n}
} {~n}

{/.Directives.skip}
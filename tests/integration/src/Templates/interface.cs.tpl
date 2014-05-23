{^.Directives.skip}

{>"./templates/namespace.tpl"/}
{ {~n}

	{#Interface}
		{@indent/}
		public interface {Name}{+genericParams/}
			{?Extends}
				:
				{#Extends}
					{+typeName/}
					{@sep},{/sep}
				{/Extends}
			{/Extends}
			{ }
	{/Interface}

{~n}
} {~n}

{<typeName}{>"./templates/typeName.tpl"/}{/typeName}
{<genericParams}{>"./templates/genericParams.tpl"/}{/genericParams}

{/.Directives.skip}
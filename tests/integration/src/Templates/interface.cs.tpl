// interface {~n}
{^.Directives.skip}

{>"./Templates/namespace.tpl"/}
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

{<typeName}{>"./Templates/typeName.tpl"/}{/typeName}
{<genericParams}{>"./Templates/genericParams.tpl"/}{/genericParams}

{/.Directives.skip}
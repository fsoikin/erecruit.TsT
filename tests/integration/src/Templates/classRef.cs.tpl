// This is class {~n}
{^.Directives.skip}

{>"./Templates/namespace.tpl"/}
{ {~n} 
	public class {Name}{+genericParams/}
		{?Implements}
			:
			{#Implements}
				{+typeName/}
				{@sep},{/sep}
			{/Implements}
		{/Implements}
	{
		{#Constructors class=.}
			{~n}
			{@indent count=2/}
			public static IClassRef<{Name}> Ref{+genericParams/}( 
				{#Parameters}
					{#Type}{+typeName/}{/Type} {Name}
					{@sep},{/sep}
				{/Parameters}
			) { 
				return ClassRef.Create<{class.Name}>( "app/{@fs_fileNameWithoutExtension path="{class.Document.Path}" /}", "{class.Name}", {#Parameters} {Name} {@sep},{/sep} {/Parameters} );
			}
		{/Constructors}
	}
{~n}
} {~n}

{<typeName}{>"./Templates/typeName.tpl"/}{/typeName}
{<genericParams}{>"./Templates/genericParams.tpl"/}{/genericParams}

{/.Directives.skip}
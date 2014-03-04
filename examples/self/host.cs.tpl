{! 
	This is a Dust template.
	For more information about Dust and its usage see https://github.com/linkedin/dustjs/wiki/Dust-Tutorial
	For more information about TsT-specific helpers see https://github.com/erecruit/TsT
!}

namespace erecruit.TsT.JS{@cs_whenEmptyNamespace}{:else}.{/cs_whenEmptyNamespace}{@cs_typeNamespace/} { {~n}

	{#Interface}
		{@indent/}
		public interface {Name} { {~n}
			{#Properties}
				{@indent count=2/}
				public {#Type}{@cs_typeFullName/}{/Type} {Name} { get; set; } {~n}
			{/Properties}

			{#Methods}
				{#Signatures}
					{@indent count=2/}
					{#ReturnType}{@cs_typeFullName/}{:else}void{/ReturnType} {Name}(
						{#Parameters}
							{#Type}{@cs_typeFullName/}{/Type} {Name}{@sep},{/sep}
						{/Parameters}
					); {~n}
				{/Signatures}
			{/Methods}

			{@indent/}
		}
	{/Interface}

{~n}
} {~n}
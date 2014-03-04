{! 
	This is a Dust template.
	For more information about Dust and its usage see https://github.com/linkedin/dustjs/wiki/Dust-Tutorial
	For more information about TsT-specific helpers see https://github.com/erecruit/TsT
!}

namespace erecruit.TsT.JS{@cs_whenEmptyNamespace}{:else}.{/cs_whenEmptyNamespace}{@cs_typeNamespace/} { {~n}

	{#Interface}{?Properties}
		{@indent/}
		public class {Name}{+genericParams/} { {~n}
			{#Properties}
				{@indent count=2/}
				public {#Type}{@cs_typeFullName/}{/Type} {Name} { get; set; } {~n}
			{/Properties}
			{@indent/}
		}
	{/Properties}{/Interface}

	{#Enum}
		{@indent/}
		public enum {Name} { {~n}
			{#Values}
				{@indent count=2/}
				{Name}={Value}
				{@sep},{/sep}
				{~n}
			{/Values} 
			{@indent/}
		}
	{/Enum}

{~n}
} {~n}

{<genericParams}
	{?GenericParameters}<{#GenericParameters}{GenericParameter.Name}{@sep},{/sep}{/GenericParameters}>{/GenericParameters}
{/genericParams}
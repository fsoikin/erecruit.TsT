// type {~n}
{! 
	This is a Dust template.
	For more information about Dust and its usage see https://github.com/linkedin/dustjs/wiki/Dust-Tutorial
	For more information about TsT-specific helpers see https://github.com/erecruit/TsT
!}
{^.Directives.skip}

{>"./Templates/namespace.tpl"/}
{ {~n} 
	{?.Directives.Attributes}{@indent/}{.Directives.Attributes|s}{~n}{/.Directives.Attributes}
	{#Interface}{?Properties}
			
		{+comment/}
		{@indent/}

		public class {Name}{+genericParams/}{~s}
			{?Extends}
				: {~s}
				{#Extends}
					{+typeName/}
					{@sep},{/sep}
				{/Extends}
			{/Extends}
			{ {~n}
				
			{#Properties}{^.Directives.skip}
				{@indent count=2/}
				{.Directives.Attributes|s}
				{+defaultValueHandling/}
				public 
					{#.Directives.type}
						{.|s}
					{:else}
						{#Type}{+typeName/}{/Type}{?.Directives.Nullable}?{/.Directives.Nullable} 
					{/.Directives.type}
					{~s} {Name} 
					{ get; set; } 
				{~n}
			{/.Directives.skip}{/Properties}

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

{/.Directives.skip}

{! ******************************************************************************** !}
{! * Partials                                                                     * !}
{! ******************************************************************************** !}

{<genericArgs}
	<{#.Arguments}{+typeName/}{@sep},{/sep}{/.Arguments}>
{/genericArgs}

{<typeName}{>"./Templates/typeName.tpl"/}{/typeName}
{<genericParams}{>"./Templates/genericParams.tpl"/}{/genericParams}

{<defaultValueHandling}
	{#.Directives.DefaultValueHandling}
		[Newtonsoft.Json.JsonProperty(DefaultValueHandling=Newtonsoft.Json.DefaultValueHandling.{.})]
	{/.Directives.DefaultValueHandling}
	{#.Directives.NullValueHandling}
		[Newtonsoft.Json.JsonProperty(NullValueHandling=Newtonsoft.Json.NullValueHandling.{.})]
	{/.Directives.NullValueHandling}
{/defaultValueHandling}

{<comment}
	{?Comment}{@indent/}/// <summary>{@replace str="{Comment}" regex="[\r\n]+" flags="g" replacement=" "/}</summary> {~n}{/Comment}
{/comment}
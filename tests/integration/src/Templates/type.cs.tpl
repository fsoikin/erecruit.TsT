{! 
	This is a Dust template.
	For more information about Dust and its usage see https://github.com/linkedin/dustjs/wiki/Dust-Tutorial
	For more information about TsT-specific helpers see https://github.com/erecruit/TsT
!}
{^.Directives.skip}

{>"./templates/namespace.tpl"/}
{ {~n} 
	{@whenType}
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
							{.}
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
	{/whenType}

	{@whenClass}
		{@indent/}
		public partial class {@fs_fileNameWithoutExtension path="Module.Path"/}{+genericParams/} { {~n}
			{#Constructors}
				{@indent count="2"/}
				public static string {Name}(
					{#Parameters}
						{#Type}{+typeName/}{/Type} {Name}{@sep},{/sep}
					{/Parameters}
				) = "{Name}, {@fs_relativePath path="{Module.Path}"/}";{~n}
			{/Constructors}
		{@indent/}
		}
	{/whenClass}

{~n}
} {~n}

{/.Directives.skip}

{! ******************************************************************************** !}
{! * Partials                                                                     * !}
{! ******************************************************************************** !}

{<genericArgs}
	<{#.Arguments}{+typeName/}{@sep},{/sep}{/.Arguments}>
{/genericArgs}

{<typeName}{>"./templates/typeName.tpl"/}{/typeName}
{<genericParams}{>"./templates/genericParams.tpl"/}{/genericParams}

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
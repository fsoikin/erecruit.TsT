
{@csharpClass}
namespace erecruit.JS{#Namespace}.{.}{/Namespace} { {~n}

	{?IsInterface}{?Properties}
		{@indent/}
		public class {Name}{+genericParams/} { {~n}
			{#Properties}
				{@indent count=2/}
				public {Type} {Name} { get; set; } {~n}
			{/Properties}
			{@indent/}
		}
	{/Properties}{/IsInterface}

	{?IsEnum}
		{@indent/}
		public enum {Name} { {~n}
			{#EnumValues}
				{@indent count=2/}
				{Name}={Value}
				{@sep},{/sep}
				{~n}
			{/EnumValues} 
			{@indent/}
		}
	{/IsEnum}

	{?IsClass}
		{@indent/}
		public partial static class {@fs_fileNameWithoutExtension path="Module.Path"/}{+genericParams/} { {~n}
			{#Constructors}
				{@indent count="2"/}
				public static string {Name}(
					{#Parameters}
						{Type} {Name}{@sep},{/sep}
					{/Parameters}
				) = "{Name}, {@fs_relativePath path="{Module.Path}"/}";{~n}
			{/Constructors}
		{@indent/}
		}
	{/IsClass}

{~n}
} {~n}
{/csharpClass}

{<genericParams}
	{?GenericParameters}<{#GenericParameters}{Name}{@sep},{/sep}{/GenericParameters}>{/GenericParameters}
{/genericParams}
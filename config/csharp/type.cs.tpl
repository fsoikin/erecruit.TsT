
{@csharpClass file="File" type="."}
namespace erecruit.JS{#Namespace}.{.}{/Namespace} {
	{?IsInterface}
		public class {Name}{?GenericParameters}<{#GenericParameters}{Name}{@sep},{/sep}{/GenericParameters}>{/GenericParameters}
		{
			{#Properties}
			public {Type} {Name} { get; set; }
			{/Properties}
		}
	{/IsInterface}
	{?IsEnum}
		public enum {Name} { {#EnumValues}{Name}={Value}{/EnumValues} }
	{/IsEnum}
}
{/csharpClass}
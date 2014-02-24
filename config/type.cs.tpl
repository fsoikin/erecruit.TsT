
{#Interface}
namespace erecruit.JS{@if cond="'{File.RelativeDir}'.length > 0"}.{@replace str="{File.RelativeDir}" regex="/" replacement="." /}{/if} {
	public class {Name}{@if cond="{GenericParameters.length}"}<{#GenericParameters}{GenericParameter.Name}{@sep},{/sep}{/GenericParameters}>{/if}
	{
		{#Properties}
		public {@typeName path="{Type}"/} {Name} { get; set; }
		{/Properties}
	}
}
{/Interface}
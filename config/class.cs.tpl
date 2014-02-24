
namespace erecruit.JS{@if cond="'{File.RelativeDir}'.length > 0"}.{@replace str="{File.RelativeDir}" regex="/" replacement="." /}{/if} {
	public static partial class {File.NameWithoutExtension} {
		public static erecruit.JS.ClassRef {Name} = null;
	}
}
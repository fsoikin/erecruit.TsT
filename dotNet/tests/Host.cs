using Xunit;

namespace erecruit.TsT.Tests
{
	public class Host
	{
		[Fact]
		public void Should_correctly_calculate_parent_directory() {
			var host = new erecruit.TsT.Host( @"C:\a\b\c" );
			Assert.Equal( "x/y", host.GetParentDirectory( "x/y/z" ) );
		}
	}
}
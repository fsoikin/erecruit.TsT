using System;
using System.IO;

namespace erecruit.TsT
{
	public static class PathUtil
	{
		public static string MakeRelativePath( string from, string to ) {
			if ( string.IsNullOrEmpty( from ) ) return to;
			if ( string.IsNullOrEmpty( to ) ) return from;

			from = Path.GetFullPath( from );
			to = Path.GetFullPath( to );

			if ( from == to ) return "";
			var fromUri = new Uri( from + "/x" );
			var toUri = new Uri( to );
			return fromUri.Scheme != toUri.Scheme ? to : Uri.UnescapeDataString( fromUri.MakeRelativeUri( toUri ).ToString() );
		}
	}
}
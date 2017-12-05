// Guids.cs
// MUST match guids.h
using System;

namespace erecruit.vs
{
	static class GuidList
	{
		public const string guidvsPkgString = "f95d8dce-65f6-412e-8a3d-512cf66547d9";
		public const string guidvsCmdSetString = "bd519ccf-306d-445d-9b08-a64144a12dfc";

		public static readonly Guid guidvsCmdSet = new Guid( guidvsCmdSetString );

		public static readonly Guid OutputPane = new Guid( "{FABD07E4-49DF-4C03-9374-9844DFD2BBC5}" );
	};
}
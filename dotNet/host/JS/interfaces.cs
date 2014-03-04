namespace erecruit.TsT.JS { 
	public class Module { 
		public string Path { get; set; } 
		public Class[] Classes { get; set; } 
		public Type[] Types { get; set; } 
	}
} 

namespace erecruit.TsT.JS { 
	public enum ModuleElementKind { 
		Class=0,
		Type=1
 	}
} 

namespace erecruit.TsT.JS { 
	public class ModuleElement { 
		public Module Module { get; set; } 
		public string InternalModule { get; set; } 
		public ModuleElementKind Kind { get; set; } 
	}
} 

namespace erecruit.TsT.JS { 
	public class Class { 
		public string Name { get; set; } 
		public Type[] Implements { get; set; } 
		public Type[] GenericParameters { get; set; } 
		public CallSignature[] Constructors { get; set; } 
	}
} 

namespace erecruit.TsT.JS { 
	public class Type { 
		public PrimitiveType PrimitiveType { get; set; } 
		public Enum Enum { get; set; } 
		public Interface Interface { get; set; } 
		public GenericParameter GenericParameter { get; set; } 
		public Type Array { get; set; } 
	}
} 

namespace erecruit.TsT.JS { 
	public enum PrimitiveType { 
		Any=0,
		String=1,
		Boolean=2,
		Number=3
 	}
} 

namespace erecruit.TsT.JS { 
	public class GenericParameter { 
		public string Name { get; set; } 
		public Type Constraint { get; set; } 
	}
} 

namespace erecruit.TsT.JS { 
	public class Enum { 
		public string Name { get; set; } 
		public object[] Values { get; set; } 
	}
} 

namespace erecruit.TsT.JS { 
	public class Interface { 
		public string Name { get; set; } 
		public Type[] Extends { get; set; } 
		public Type[] GenericParameters { get; set; } 
		public Identifier[] Properties { get; set; } 
		public Method[] Methods { get; set; } 
	}
} 

namespace erecruit.TsT.JS { 
	public class Method { 
		public string Name { get; set; } 
		public CallSignature[] Signatures { get; set; } 
	}
} 

namespace erecruit.TsT.JS { 
	public class Identifier { 
		public string Name { get; set; } 
		public Type Type { get; set; } 
	}
} 

namespace erecruit.TsT.JS { 
	public class CallSignature { 
		public Type[] GenericParameters { get; set; } 
		public Identifier[] Parameters { get; set; } 
		public Type ReturnType { get; set; } 
	}
} 

namespace erecruit.TsT.JS { 
	public interface ITsTHost { 
		string FetchFile(string fileName); 
		string ResolveRelativePath(string path,string directory); 
		string MakeRelativePath(string from,string to); 
		bool DirectoryExists(string path); 
		string GetParentDirectory(string path); 
		string[] GetIncludedTypingFiles(); 
	}
} 

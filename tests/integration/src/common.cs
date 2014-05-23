// common.ts
namespace erecruit.JS { 
 	public class User { 
		public string   Id { get; set; } 
		public string   Name { get; set; } 
		public UserKind   Kind { get; set; } 
		public  int?    ReferenceId { get; set; } 
	}
} 

// common.ts
namespace erecruit.JS { 
 	public enum UserKind { 
		Recruiter=0,
		Contact=1,
		Candidate=2
 	}
} 

// common.ts
namespace erecruit.JS { 
 	public enum SharingOptions { 
		Recruiters=1,
		Vendors=2,
		VendorManagers=4,
		Contacts=8,
		Candidates=16,
		Nobody=0,
		Everyone=31
 	}
} 

// common.ts
namespace erecruit.JS { 
 	public enum LoggedInAsModes { 
		Recruiter=1,
		Candidate=2,
		Contact=4,
		Vendor=8,
		VendorManager=16,
		API=32,
		None=0,
		All=31,
		NotVendor=23
 	}
} 

// common.ts
namespace erecruit.JS { 
 	public class NameValuePair<T> { 
		public string   Name { get; set; } 
		public T   Value { get; set; } 
	}
} 

// common.ts
namespace erecruit.JS { 
 	public enum WeekDays { 
		Sunday=0,
		Monday=1,
		Tuesday=2,
		Wednesday=3,
		Thursday=4,
		Friday=5,
		Saturday=6
 	}
} 

// common.ts
namespace erecruit.JS { 
 	public enum Months { 
		January=1,
		February=2,
		March=3,
		April=4,
		May=5,
		June=6,
		July=7,
		August=8,
		September=9,
		October=10,
		November=11,
		December=12
 	}
} 

// common.ts
namespace erecruit.JS { 
 
} 

// common.ts
namespace erecruit.JS { 
 
} 

// common.ts
namespace erecruit.JS { 
 
} 

// common.ts
namespace erecruit.JS { 
 
} 

// common.ts
namespace erecruit.JS { 
 
} 

// common.ts
namespace erecruit.JS { 
 
} 

// common.ts
namespace erecruit.JS { 
 
} 

// common.ts
namespace erecruit.JS { 
 
} 

// common.ts
namespace erecruit.JS { 
 
} 

// common.ts
namespace erecruit.JS { 
 
} 

// common.ts
namespace erecruit.JS { 
 
} 

// common.ts
namespace erecruit.JS { 
 
} 

// common.ts
namespace erecruit.JS { 
 
} 

// common.ts
namespace erecruit.JS { 
 
} 

// common.ts
namespace erecruit.JS { 
 
} 

// common.ts
namespace erecruit.JS { 
 
} 

// common.ts
namespace erecruit.JS { 
 
} 

// common.ts
namespace erecruit.JS { 
 
} 

// common.ts
namespace erecruit.JS { 
 
} 

// common.ts
namespace erecruit.JS { 
 
} 

// common.ts
namespace erecruit.JS { 
	public interface IControl{ }
} 

// common.ts
namespace erecruit.JS { 
	public interface IUnloadableControl:IControl{ }
} 

// common.ts
namespace erecruit.JS { 
	public interface IVirtualControl:IControl{ }
} 

// common.ts
namespace erecruit.JS { 
	public interface IFeedbackSink{ }
} 

// common.ts
namespace erecruit.JS { 
	public interface IDataSource<T>{ }
} 

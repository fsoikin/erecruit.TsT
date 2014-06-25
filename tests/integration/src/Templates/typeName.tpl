{+localTypeName/}

{<localTypeName}
	{#. type=.}

		{#.Directives.ServerSideType}
			{.}
			{#type.GenericInstantiation}{+genericArgs/}{/type.GenericInstantiation}
		{:else}

		{#.Enum}
			{@select key="{.Name}"}
				{@eq value="AboutType"}erecruit.BL.DataModel.AboutTypes{/eq}
				{@default}{#type}{@cs_typeFullName/}{/type}{/default}
			{/select}
		{:else}

		{#.Interface}
			{@select key="{.Name}"}
				{@eq value="AboutObjectId"}erecruit.JS.AboutObjectId{/eq}
				{@eq value="ClassRef"}erecruit.JS.ClassRef{/eq}
				{@eq value="DateTime"}System.DateTime{/eq}
				{@eq value="Date"}System.DateTime{/eq}
				{@default}{#type}{@cs_typeFullName/}{/type}{/default}
			{/select}
		{:else}

		{#.GenericInstantiation}
			{#.Definition.Interface}
				{@select key="{.Name}"}
					{@eq value="IHaveNameAndId"}erecruit.JS.NamedObject{/eq}
					{@eq value="Range"}
						erecruit.Utils.Range
						{#type.GenericInstantiation}{+genericArgs/}{/type.GenericInstantiation}
					{/eq}
					{@default}
						{#type.GenericInstantiation}
							{#.Definition}{+localTypeName/}{/.Definition}
							{+genericArgs/}
						{/type.GenericInstantiation}
					{/default}
				{/select}
			{/.Definition.Interface}
		{:else}
		
		{#.Array}
			{@test str="{.PrimitiveType}" regex="3"} 
				{! number !}
				int[] 
			{:else}
				{+localTypeName/}[]
			{/test}
		{:else}

		{@test str="{.PrimitiveType}" regex="3"} 
			{! number !}
			int? 
		{:else}

		{@cs_typeFullName/}
		
		{/test}
		{/.Array}
		{/.GenericInstantiation}
		{/.Interface}
		{/.Enum}
		{/.Directives.ServerSideType}

	{/.}
{/localTypeName}

{<genericArgs}
	<{#.Arguments}{+localTypeName/}{@sep},{/sep}{/.Arguments}>
{/genericArgs}
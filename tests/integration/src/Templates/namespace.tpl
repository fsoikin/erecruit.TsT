
	// {Document.Path}{~n}
	namespace erecruit.JS
		{@test str="{Document.Path}" regex="^Base"}
			{! Empty namespace for everything in /Base/ !}
		{:else}
			{@cs_whenEmptyNamespace}{:else}.{/cs_whenEmptyNamespace}
			{@cs_typeNamespace/} 
		{/test}
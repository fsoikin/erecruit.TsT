module erecruit.TsT.Tests.Extr {

	export function classes() {
		group( "should correctly parse class", () => {
			it( " - simple", () => {
				file = "export class C { }";
				expect( trimAndUnwrapAll( e.GetDocument( fileName ).Classes ) ).toEqual( [
					c( {
						Name: 'C'
					})
				] );
			});
		});
	}
}
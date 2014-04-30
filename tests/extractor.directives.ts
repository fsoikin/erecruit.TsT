module erecruit.TsT.Tests.Extr {

	export function directives() {

		group( "should extract directives", () => {
			it( "on interfaces", () => {
				file = "/** @dir value*/ export interface I {}";
				expect( trimAndUnwrapAll( e.GetDocument( fileName ).Types, false )[0].Directives ).toEqual( { dir: 'value' } );
			});

			xit( "on classes", () => {
				file = "/** @dir value*/ export class C {}";
				expect( e.GetDocument( fileName ).Classes[0].Directives ).toEqual( { dir: 'value' } );
			});

			xit( "on variables with constructor signatures", () => {
				file = "/** @dir value*/ export var C: { new: () => string } = null";
				expect( e.GetDocument( fileName ).Classes[0].Directives ).toEqual( { dir: 'value' });
			});

			it( "on properties", () => {
				file = "export interface I { \r\n/** @dir value*/ X: string }";
				expect( trimAndUnwrapAll( e.GetDocument( fileName ).Types, false )[0] ).toEqual( c( {
					Interface: c( {
						Properties: [
							c( {
								Directives: { dir: "value" },
								Name: 'X'
							})
						]
					})
				}) );
			});

			it( "on methods", () => {
				file = "export interface I { \r\n/** @dir value1*/ X(): string; \r\n/** @dir value2*/ X( p: number ): number; }";
				var m = <Method>( <any>trimAndUnwrapAll( e.GetDocument( fileName ).Types, false )[0].Interface ).Methods[0];
				expect( m.Name ).toEqual( 'X' );
				expect( m.Signatures.sort( ( a, b ) => a.Parameters.length - b.Parameters.length ) ).toEqual( [
					c( { Directives: { dir: "value1" }, Parameters: [] }),
					c( { Directives: { dir: "value2" }, Parameters: [c( { Name: 'p' })] })
				] );
			});

			it( "on several lines", () => {
				t( "Some comment \r\n\
									Whatever \r\n\
									\r\n\
									@dir value\r\n\
									@dir2 value2",
					{
						dir: 'value',
						dir2: 'value2'
					});
			});

			it( "and trim whitespace from values", () => {
				t( "@dir    value2  ", { dir: 'value2' } );
			});

			it( "with later namesakes overriding earlier ones", () => {
				t( "@dir    value1\r\n@dir value2", { dir: 'value2' });
			});

			it( "and tolerate empty values", () => {
				t( "@dir   ", { dir: '' });
			});
		});
	}

	function t( comment: string, directives: { [dir: string]: string }) {
		file = "/** " + comment + "*/\r\nexport interface I { }";
		expect( trimAndUnwrapAll( e.GetDocument( fileName ).Types, false )[0].Directives ).toEqual( directives );
	}
}
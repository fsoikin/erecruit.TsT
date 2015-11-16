module erecruit.TsT.Tests.Extr {

	export function comments() {
		group( "should extract comments", () => {
			it( "on interfaces", () => {
				file = "/** A comment*/ export interface I {}";
				var types = trimAndUnwrapAll( e().GetDocument( fileName ).Types, false );
				expect( types.length ).toEqual( 1 );
				expect( types[0].Comment ).toEqual( "A comment" );
				expect( ( <any>types[0].Interface ).Name ).toEqual( "I" );
			});

			it( "on classes", () => {
				file = "/** A comment*/ export class C {}";
				expect( e().GetDocument( fileName ).Classes ).toEqual( [
					c( { Comment: "A comment", Name: "C" })
				] );
			});

			it( "on variables with construct signatures", () => {
				file = "/** A comment*/ export var C: { new(): string } = null";
				expect( e().GetDocument( fileName ).Classes ).toEqual( [
					c( { Comment: "A comment", Name: "C" })
				] );
			});

			it( "on properties", () => {
				file = "export interface I { \r\n\
									/** A comment*/ X: string \
								}";
				expect( trimAndUnwrapAll( e().GetDocument( fileName ).Types, false )[0] ).toEqual( c( {
					Interface: c( {
						Properties: [
							c( {
								Comment: "A comment",
								Name: 'X'
							})
						]
					})
				}) );
			});

			it( "on methods", () => {
				file = "export interface I { \r\n\
									/** Comment 1*/ X(): string; \r\n\
									/** Comment 2*/ X( p: number ): number;\
								}";
				var m = <Method>( <any>trimAndUnwrapAll( e().GetDocument( fileName ).Types, false )[0].Interface ).Methods[0];
				expect( m.Name ).toEqual( 'X' );
				expect( m.Signatures.sort( ( a, b ) => a.Parameters.length - b.Parameters.length ) ).toEqual( [
					c( { Comment: "Comment 1", Parameters: [] }),
					c( { Comment: "Comment 2", Parameters: [c( { Name: 'p' })] })
				] );
			});
		});
	}
}
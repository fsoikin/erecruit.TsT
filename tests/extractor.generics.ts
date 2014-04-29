module erecruit.TsT.Tests.Extr {

	export function generics() {
		group( "should correctly parse generic interfaces", () => {
			it( "with one parameter", () => {
				file = "export interface I<T> { X: T[]; Y: T; }";
				expect( trimAndUnwrapAll( e.GetDocument( fileName ).Types ).map( t => t.Interface ) ).toEqual( [
					c( {
						Name: 'I',
						GenericParameters: [c( { GenericParameter: { Name: 'T', Constraint: null } })],
						Properties: [
							{ Name: 'X', Type: c( { Array: c( { GenericParameter: { Name: 'T', Constraint: null } }) }) },
							{ Name: 'Y', Type: c( { GenericParameter: { Name: 'T', Constraint: null } }) },
						]
					})
				] );
			});

			it( "with two parameters", () => {
				file = "export interface I<T,S> { X: T[]; Y: S; }";
				expect( trimAndUnwrapAll( e.GetDocument( fileName ).Types ).map( t => t.Interface ) ).toEqual( [
					c( {
						Name: 'I',
						GenericParameters: [
							c( { GenericParameter: { Name: 'T', Constraint: null } }),
							c( { GenericParameter: { Name: 'S', Constraint: null } })
						],
						Properties: [
							{ Name: 'X', Type: c( { Array: c( { GenericParameter: { Name: 'T', Constraint: null } }) }) },
							{ Name: 'Y', Type: c( { GenericParameter: { Name: 'S', Constraint: null } }) },
						]
					})
				] );
			});

			it( "inheriting from other generic interfaces", () => {
				file = "export interface I<T> extends J<T> { X: T[]; } export interface J<S> { Y: S }";
				expect( trimAndUnwrapAll( e.GetDocument( fileName ).Types ).map( t => t.Interface ) ).toEqual( [
					c( {
						Name: 'I',
						GenericParameters: [{ GenericParameter: { Name: 'T', Constraint: null } }],
						Extends: [c( {
							GenericInstantiation: {
								Definition: 'J',
								Arguments: [{ GenericParameter: c( { Name: 'T' }) }]
							}
						})],
						Properties: [
							{ Name: 'X', Type: { Array: { GenericParameter: { Name: 'T', Constraint: null } } } },
						]
					}),
					c( {
						Name: 'J',
						GenericParameters: [{ GenericParameter: { Name: 'S', Constraint: null } }],
						Properties: [{ Name: 'Y', Type: { GenericParameter: c( { Name: 'S' }) } }]
					})
				] );
			});

			it( "concretely instantiated and used in a base type position", () => {
				file = "export interface I extends J<number> { } export interface J<S> { Y: S }";
				expect( trimAndUnwrapAll( e.GetDocument( fileName ).Types ).map( t => t.Interface ) ).toEqual( [
					c( {
						Name: 'I',
						Extends: [{
							GenericInstantiation: {
								Definition: 'J',
								Arguments: [c( { PrimitiveType: PrimitiveType.Number })]
							}
						}]
					}),
					c( {
						Name: 'J',
						GenericParameters: [{ GenericParameter: { Name: 'S', Constraint: null } }],
						Properties: [{ Name: 'Y', Type: { GenericParameter: c( { Name: 'S' }) } }]
					})
				] );
			});

			it( "with parameters constrained by regular types", () => {
				file = "export interface I<T extends J> { X: T; } export interface J {}";
				expect( trimAndUnwrapAll( e.GetDocument( fileName ).Types ).map( t => t.Interface ) ).toEqual( [
					c( {
						Name: 'I',
						GenericParameters: [
							c( { GenericParameter: { Name: 'T', Constraint: c( { Interface: c( { Name: 'J' }) }) } })
						],
						Properties: [
							{ Name: 'X', Type: c( { GenericParameter: c( { Name: 'T' }) }) },
						]
					}),
					c( { Name: 'J' })
				] );
			});

		});
	}
}
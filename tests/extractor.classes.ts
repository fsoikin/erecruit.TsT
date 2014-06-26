module erecruit.TsT.Tests.Extr {

	export function classes() {
		group( "should correctly parse class", () => {
			it( " - simple", () => {
				file = "export class C { }";
				var m = e.GetDocument( fileName );
				expect( trimAndUnwrapAllClasses( m.Classes ) ).toEqual( [c( { Name: 'C', PrimaryInterface: { Interface: c( { Name: 'C' })} })] );
				expect( trimAndUnwrapAll( m.Types ) ).toEqual( [{ Interface: c({ Name: 'C' }) }] );
			});

			it( " with parameterless constructors", () => {
				file = "export class C { constructor() {} }";
				expect( trimAndUnwrapAllClasses( e.GetDocument( fileName ).Classes ) ).toEqual( [
					c( {
						Name: 'C',
						Constructors: [c( { Parameters: [] })]
					})
				] );
			});

			it( " with constructors with parameters", () => {
				file = "export class C { constructor( x: number, y: string ) {} }";
				expect( trimAndUnwrapAllClasses( e.GetDocument( fileName ).Classes ) ).toEqual( [
					c( {
						Name: 'C',
						Constructors: [c( {
							Parameters: [
								c({ Name: 'x', Type: c( { PrimitiveType: PrimitiveType.Number }) }),
								c({ Name: 'y', Type: c( { PrimitiveType: PrimitiveType.String }) }),
							]
						})]
					})
				] );
			});

			it( " which is generic", () => {
				file = "export class C<T> { constructor( x: number, y: string ) {} }";
				expect( trimAndUnwrapAllClasses( e.GetDocument( fileName ).Classes ) ).toEqual( [
					c( {
						Name: 'C',
						GenericParameters: [c( { GenericParameter: c( {Name: 'T'})})],
						Constructors: [c( {
							Parameters: [
								c( { Name: 'x', Type: c( { PrimitiveType: PrimitiveType.Number }) }),
								c( { Name: 'y', Type: c( { PrimitiveType: PrimitiveType.String }) }),
							]
						})]
					})
				] );
			});

			it( " which is generic and has constructor with generic parameters", () => {
				file = "export class C<T> { constructor( x: T, y: string ) {} }";
				expect( trimAndUnwrapAllClasses( e.GetDocument( fileName ).Classes ) ).toEqual( [
					c( {
						Name: 'C',
						GenericParameters: [c( { GenericParameter: c( { Name: 'T' }) })],
						Constructors: [c( {
							Parameters: [
								c( { Name: 'x', Type: c( { GenericParameter: c( {Name: 'T'}) }) }),
								c( { Name: 'y', Type: c( { PrimitiveType: PrimitiveType.String }) }),
							]
						})]
					})
				] );
			});

			fit( " should not put base class in the list of interfaces", () => {
				file = "export class A {} \
								export interface I {}\
								export class B extends A implements I {}";
				expect( trimAndUnwrapAllClasses( e.GetDocument( fileName ).Classes ) ).toEqual( [
					c( { Name: 'A', PrimaryInterface: c({ Interface: c({ Name: 'A' }) }) }),
					c( {
						Name: 'B',
						PrimaryInterface: c({ Interface: c({ Name: 'B' }) }),
						BaseClass: c( { Name: 'A' }),
						Implements: [c( { Interface: c( { Name: 'I' }) })]
					})
				] );
			});

			it( " with multiple constructor overloads", () => {
				file = "export class C { \
					constructor( x: number, y: string ) {} \
					constructor( x: string; y: string ) {} \
					constructor( x: any; y: any ) {} }";
				expect( trimAndUnwrapAllClasses( e.GetDocument( fileName ).Classes ) ).toEqual( [
					c( {
						Name: 'C',
						Constructors: [
							c( {
								Parameters: [
									{ Name: 'x', Type: { PrimitiveType: PrimitiveType.Number } },
									{ Name: 'y', Type: { PrimitiveType: PrimitiveType.String } },
								]
							}),
							c( {
								Parameters: [
									{ Name: 'x', Type: { PrimitiveType: PrimitiveType.String } },
									{ Name: 'y', Type: { PrimitiveType: PrimitiveType.String } },
								]
							}),
							c( {
								Parameters: [
									{ Name: 'x', Type: { PrimitiveType: PrimitiveType.Any } },
									{ Name: 'y', Type: { PrimitiveType: PrimitiveType.Any } },
								]
							})
						]
					})
				] );
			});
		});
	}
}
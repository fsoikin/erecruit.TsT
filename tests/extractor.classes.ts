module erecruit.TsT.Tests.Extr {

	export function classes() {
		group( "should correctly parse class", () => {
			it( " - simple", () => {
				file = "export class C { }";
				var m = e().GetDocument( fileName );
				expect( trimAndUnwrapAllClasses( m.Classes ) ).toEqual( [c( { Name: 'C', PrimaryInterface: { Interface: c( { Name: 'C' })} })] );
				expect( trimAndUnwrapAll( m.Types ) ).toEqual( [{ Interface: c({ Name: 'C' }) }] );
			});

			it( "with parameterless constructors", () => {
				file = "export class C { constructor() {} }";
				expect( trimAndUnwrapAllClasses( e().GetDocument( fileName ).Classes ) ).toEqual( [
					c( {
						Name: 'C',
						Constructors: [c( { Parameters: [] })]
					})
				] );
			});

			it( "with constructors with parameters", () => {
				file = "export class C { constructor( x: number, y: string ) {} }";
				expect( trimAndUnwrapAllClasses( e().GetDocument( fileName ).Classes ) ).toEqual( [
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

			it( "which is generic", () => {
				file = "export class C<T> { constructor( x: number, y: string ) {} }";
				expect( trimAndUnwrapAllClasses( e().GetDocument( fileName ).Classes ) ).toEqual( [
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

			it( "which is generic and has constructor with generic parameters", () => {
				file = "export class C<T> { constructor( x: T, y: string ) {} }";
				expect( trimAndUnwrapAllClasses( e().GetDocument( fileName ).Classes ) ).toEqual( [
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

		});

		it( "should not put base class in the list of interfaces", () => {
			file = "export class A {} \
							export interface I {}\
							export class B extends A implements I {}";
			expect( trimAndUnwrapAllClasses( e().GetDocument( fileName ).Classes ) ).toEqual( [
				c( { Name: 'A', PrimaryInterface: c( { Interface: c( { Name: 'A' }) }) }),
				c( {
					Name: 'B',
					PrimaryInterface: c( { Interface: c( { Name: 'B' }) }),
					BaseClass: c( { Name: 'A' }),
					Implements: [c( { Interface: c( { Name: 'I' }) })]
				})
			] );
		});

		it( "should not include generic base classes in the list of implemented interfaces", () => {
			file = "export class A<T> {} \
							export interface I {}\
							export class B extends A<number> implements I {}";
			let classes = e().GetDocument( fileName ).Classes;
			expect( classes.length ).toEqual( 2 );
			
			let B = classes[1];
			expect( B.Implements.map( getTypeName ) ).toEqual( ["I"] );
		});

		it( "should not include type-alias base classes in the list of implemented interfaces", () => {
			file = `export interface I {}

							export class A1 {} 
							type A1a = A1
							export class B1 extends A1a implements I {}

							export class A2<T> {} 
							type A2a = A2<number>
							export class B2 extends A2a implements I {}

							export class A3<T, U> {} 
							type A3a<W> = A3<W, number>
							export class B3 extends A3a<string> implements I {}`;
			let classes = e().GetDocument( fileName ).Classes;
			expect( classes.length ).toEqual( 6 );

			let B1 = classes[1];
			let B2 = classes[3];
			let B3 = classes[5];
			expect( B1.Implements.map( getTypeName ) ).toEqual( ["I"] );
			expect( B2.Implements.map( getTypeName ) ).toEqual( ["I"] );
			expect( B3.Implements.map( getTypeName ) ).toEqual( ["I"] );
		});

		it( "should extract list of interfaces when some are generic", () => {
			file = "export interface I {}\
							export interface J<T> {}\
							export class B implements I, J<number> {}";
			expect( trimAndUnwrapAllClasses( e().GetDocument( fileName ).Classes ) ).toEqual( [
				c( {
					Name: 'B',
					PrimaryInterface: c( { Interface: c( { Name: 'B' }) }),
					Implements: [
						c( { Interface: c( { Name: 'I' }) }),
						{ GenericInstantiation: { Definition: 'J', Arguments: [{ PrimitiveType: PrimitiveType.Number }] } }
					]
				})
			] );
		});

		it( "should parse exported var with new() member as a class",() => {
			file = " \
					export interface I { } \
					export var x: { new ( n: number ): I } = null;";
			var m = e().GetDocument( fileName );
			expect( trimAndUnwrapAllClasses( m.Classes ) ).toEqual( [c( { Name: 'x', PrimaryInterface: { Interface: c( { Name: 'I' }) } })] );
			expect( trimAndUnwrapAll( m.Types ) ).toEqual( [{ Interface: c( { Name: 'I' }) }] );
		});
	}
}
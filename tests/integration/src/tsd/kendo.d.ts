/// <reference path="jquery.d.ts" />

// These are bits and pieces of Kendo-TypeScript definitions, taken from _kendo.web.d.ts.
// There are only definitions we currently need here, no more.
//
//   Q: Why don't we just use the _kendo.web.d.ts file directly? It is is provided by Telerik itself, isn't it?
//   A: Because it does not support AMD. The definitions provided by Telerik assume a global variable named "kendo",
//      and they are constructed in such a way that it is very difficult to make them support AMD as well.
//      And because there are so many definitions there, I have decided that it would be less burden to add them
//      here gradually, on the as-needed basis.

declare module "kendo"
{
	var _: typeof Kendo;
	export = _;
}

declare module Kendo {
	export class Observable {
		bind( eventName: string, handler: Function ): Observable;
		one( eventName: string, handler: Function ): Observable;
		trigger( eventName: string, e?: any ): boolean;
		unbind( eventName: string, handler?: any ): Observable;
	}

	export module data {
		export interface DataSourceSchema {
			aggregates?: any;
			data?: any;
			errors?: any;
			groups?: any;
			parse?: Function;
			total?: any;
			type?: string;
		}

		export interface DataSourceTransportCreate {
			cache?: boolean;
			contentType?: string;
			data?: any;
			dataType?: string;
			type?: string;
			url?: any;
		}

		export interface DataSourceTransportDestroy {
			cache?: boolean;
			contentType?: string;
			data?: any;
			dataType?: string;
			type?: string;
			url?: any;
		}

		export interface DataSourceTransportRead {
			cache?: boolean;
			contentType?: string;
			data?: any;
			dataType?: string;
			type?: string;
			url?: any;
		}

		export interface DataSourceTransportUpdate {
			cache?: boolean;
			contentType?: string;
			data?: any;
			dataType?: string;
			type?: string;
			url?: any;
		}

		export interface DataSourceTransport {
			create?: any;
			destroy?: any;
			read?: any;
			update?: any;
		}

		export interface DataSourceTransportWithObjectOperations extends DataSourceTransport {
			create?: DataSourceTransportCreate;
			destroy?: DataSourceTransportDestroy;
			read?: DataSourceTransportRead;
			update?: DataSourceTransportUpdate;
		}

		export interface DataSourceTransportWithFunctionOperations extends DataSourceTransport {
			create?: ( options: DataSourceTransportOptions ) => void;
			destroy?: ( options: DataSourceTransportOptions ) => void;
			read?: ( options: DataSourceTransportReadOptions ) => void;
			update?: ( options: DataSourceTransportOptions ) => void;
		}

		export interface DataSourceTransportOptions {
			success: ( data?: any ) => void;
			error: ( error?: any ) => void;
			data: any;
		}

		export interface DataSourceFilter {
		}

		export interface DataSourceFilterItem extends DataSourceFilter {
			operator?: string;
			field?: string;
			value?: any;
		}

		export interface DataSourceFilters extends DataSourceFilter {
			logic?: string;
			filters?: DataSourceFilter[];
		}

		export interface DataSourceSortItem {
			field?: string;
			dir?: string;
		}

		export interface DataSourceTransportReadOptionsData {
			sort?: DataSourceSortItem[];
			filter?: DataSourceFilters;
			take?: number;
			skip?: number;
		}

		export interface DataSourceTransportReadOptions extends DataSourceTransportOptions {
			data: DataSourceTransportReadOptionsData;
		}

		export interface DataSourceTransportBatchOptionsData {
			models: any[];
		}

		export interface DataSourceTransportBatchOptions extends DataSourceTransportOptions {
			data: DataSourceTransportBatchOptionsData;
		}

		export interface DataSourceOptions {
			//			aggregate?: DataSourceAggregateItem[];
			autoSync?: boolean;
			batch?: boolean;
			data?: any;
			filter?: any;
			//			group?: DataSourceGroupItem[];
			page?: number;
			pageSize?: number;
			schema?: DataSourceSchema;
			serverAggregates?: boolean;
			serverFiltering?: boolean;
			serverGrouping?: boolean;
			serverPaging?: boolean;
			serverSorting?: boolean;
			sort?: any;
			transport?: DataSourceTransport;
			type?: string;
			change? ( e: DataSourceChangeEvent ): void;
			error? ( e: DataSourceEvent ): void;
			//			sync? ( e: DataSourceEvent ): void;
			//			requestStart? ( e: DataSourceRequestStartEvent ): void;
			//			requestEnd? ( e: DataSourceRequestEndEvent ): void;
		}

		interface DataSourceEvent {
			sender?: DataSource;
		}

		interface DataSourceChangeEvent extends DataSourceEvent {
			field?: string;
			//value?: Model;
			action?: string;
			index?: number;
			//items?: Model[];
		}

		interface SortDefinition {
			field: string;
			dir: string;
		}

		interface DataSourceTransportArgs {
			data: {
				pageSize: number;
				page: number;
				sort: SortDefinition[];
				group: SortDefinition[];
			};
			success: ( data ) => void;
			error: ( xhr, textStatus, error ) => void;
		}

		export class DataSource extends Observable {
			constructor( args: DataSourceOptions );
			read( data?: any );
			fetch( cb?: () => {});

			page(): number;
			page( p: number ): void;

			group(): SortDefinition[];
			sort(): SortDefinition[];
			group( gg: SortDefinition[] );
			sort( ss: SortDefinition[] );
		}

		export var binders: {
			[key: string]: Binder;
		};

		export class Binder {
			static extend( ext: {
				init?: ( element: Element, bindings: any, options: any ) => void;
				refresh?: () => void;
				change?: () => void;
			}): Binder;
		}

		interface BinderContext {
			element: Element;
			bindings: any;
			options: any;
		}
	}

	export module web {
		interface GridColumn {
			field: string;
			title: string;
			width: number;
			hidden: boolean;
			headerAttributes: {
				[key: string]: string;
			};
			headerTemplate: string;
			template: (row: any) => string;
		}

		interface GridOptions {
			dataSource: data.DataSource;
			sortable: boolean;
			groupable: boolean;
			selectable: string;
			pageable: {
				pageSizes: number[];
			};
			reorderable: boolean;
			resizable: boolean;
			columns: GridColumn[];
			autoBind: boolean;
			dataBinding: () => void;
			dataBound: () => void;
			change: () => void;
			columnHide: () => void;
			columnShow: () => void;
			columnResize: () => void;
			columnReorder: ( e: { column: GridColumn; sender: Grid; }) => void;
		}

		interface Grid {
			columns: GridColumn[];
			showColumn( field: string ): void;
			hideColumn( field: string ): void;
			reorderColumn( index: number, column: GridColumn ): void;

			select(): HTMLTableRowElement[];
			select( rowsToSelect: HTMLElement[] ): void;
			select( rowsToSelect: any[] ): void;
			clearSelection(): void;
		}
	}
}
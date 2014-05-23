declare module erecruit.CoolTips {
	function HideAndReset( elementId: string, time: number ): void;
	function ShowMessage(elementId: string, messageType: string /* "error" or "info" */, message: string): void;
	function HideMessage( elementId: string ): void;
}

declare function OpenPage( aboutType: string, pageName: string, unknown?: any, queryString?: string ): { window: Window };
declare function GetSelectedAboutItemsFromGrid( gridId: string, primaryKey: string, aboutType: string, dummy: string ): { AboutType: string; ReferenceID: number; }[];
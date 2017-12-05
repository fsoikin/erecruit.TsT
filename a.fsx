#r "./packages/dotnet/JsPool/lib/net451/JsPool.dll"
#r "./packages/dotnet/JavaScriptEngineSwitcher.Core/lib/net45/JavaScriptEngineSwitcher.Core.dll"
#r "./packages/dotnet/JavaScriptEngineSwitcher.V8/lib/net45/JavaScriptEngineSwitcher.V8.dll"
open JSPool

let sw = JavaScriptEngineSwitcher.Core.JsEngineSwitcher.Instance
sw.EngineFactories.Add <| JavaScriptEngineSwitcher.V8.V8JsEngineFactory()
sw.DefaultEngineName <- JavaScriptEngineSwitcher.V8.V8JsEngine.EngineName

let c = JsPoolConfig()
let e = new JsPool(c)
#r "./packages/FAKE/tools/FakeLib.dll"
open Fake
open NpmHelper

Target "NpmInstall" <| fun() ->
    Npm (fun p -> { p with Command = Install Standard })

Target "BuildTS" <| fun() ->
    Npm (fun p -> { p with Command = Run "build" })
    FileHelper.CopyDir "built/src/lib" "src/lib" (fun _ -> true)

Target "TestTS" <| fun() ->
    Npm (fun p -> { p with Command = Run "test" })

"NpmInstall" ==> "BuildTS" ==> "TestTS"

RunTargetOrDefault "TestTS"
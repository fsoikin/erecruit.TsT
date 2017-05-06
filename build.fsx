#r "./packages/build/FAKE/tools/FakeLib.dll"
open Fake
open NpmHelper

let npm cmd () = Npm (fun p -> { p with Command = cmd })
let npmRun cmd = npm <| Run cmd
let version = getBuildParamOrDefault "Version" "0.0.0"
let ascii, utf8 = System.Text.Encoding.ASCII, System.Text.Encoding.UTF8

Target "PatchVersion" <| fun() ->
    FileHelper.RegexReplaceInFileWithEncoding """(?<="version":\s*")[\d\.]+(?=",)""" version ascii "package.json"
    //FileHelper.RegexReplaceInFileWithEncoding """(?<=(AssemblyVersion|AssemblyFileVersion)\(")[\d\.]+(?="\))""" version utf8 "package.json"

Target "NpmInstall" (npm <| Install Standard)
Target "TestTS" (npmRun "test")
Target "BundleJS" (npmRun "bundle")

Target "BuildTS" <| fun() ->
    npmRun "build" ()
    FileHelper.CopyDir "built/src/lib" "src/lib" (fun _ -> true)

Target "CIBuild" DoNothing
Target "NpmPublish" (
    let cmd = if buildServer = BuildServer.LocalBuild then "pack" else "publish"
    npm <| NpmCommand.Custom cmd )
    
"NpmInstall" 
    ==> "PatchVersion"
    ==> "BuildTS"
    ==> "BundleJS"
"BuildTS" ==> "TestTS"

"TestTS" ==> "CIBuild"
"BundleJS" ==> "CIBuild"
"NpmPublish" ==> "CIBuild"

RunTargetOrDefault "BundleJS"
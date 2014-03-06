$root = "$PSScriptRoot\..\.."
jake -f "$root\jakefile"
node "$root/bin/tstc.js" -c "$root/examples/self/config.json" "$root/src/interfaces.ts" "$root/src/emitter.ts"
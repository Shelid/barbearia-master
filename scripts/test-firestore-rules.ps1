$ErrorActionPreference = 'Stop'

$javaHome = 'C:\Program Files\Eclipse Adoptium\jre-21.0.10.7-hotspot'
$env:JAVA_HOME = $javaHome
$env:PATH = "$javaHome\bin;$env:PATH"

node .\node_modules\firebase-tools\lib\bin\firebase.js emulators:exec --only firestore --project barberflow-rules-test "node --test tests/firestore.rules.test.mjs"

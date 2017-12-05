# erecruit TS Translator Visual Studio extension

This extension enables you to run erecruit TS Translator right from Visual Studio IDE and automatically regenerate translation results every time you save the file, much like [TypeScript's own extension](http://www.typescriptlang.org/) does.
For more information, see the [main page of erecruit TS Translator](https://github.com/fsoikin/erecruit.TsT).

<img src="https://raw.githubusercontent.com/fsoikin/erecruit.TsT/master/doc/screenshot3.png"/>

In order for TsT to work, you must create a *.tstconfig* file in your project. To get started, take one from the [examples directory](https://github.com/fsoikin/erecruit.TsT/tree/master/examples). More information on the config file format can be found [here](https://github.com/fsoikin/erecruit.TsT#configuration-file).

Once configured, simply right-click a TypeScript file and choose "Translate TypeScript". erecruit TS Translator will generate the resulting file for you and add it to the project. From now on, every time you edit and save the TypeScript file, the result will be regenerated.

<img src="https://raw.githubusercontent.com/fsoikin/erecruit.TsT/master/doc/screenshot1.png"/>
<img src="https://raw.githubusercontent.com/fsoikin/erecruit.TsT/master/doc/screenshot2.png"/>
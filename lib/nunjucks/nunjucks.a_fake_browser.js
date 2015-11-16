
// For some reason Nunjucks is only available as a bundle for the browser scenario.
// Presumably, the only other scenario is NodeJS, and for that one can (presumably) afford not to bundle the files.
// This, however, is a mistake, because there is a third scenario - free JS chunk of code agnostic of the environment.
//
// As a result, upon discovering that it is not running in the browser (by checking typeof window === "undefined"),
// Nunjucks will default to the module 'node-loaders', which is not included in this browser-targeted bundle.
// This will cause nunjucks to crash when it subsequently tries to access that module.
//
// In order to fix this, I am creating a fake global "window" object here, which will fool nunjucks into
// thinking it's running in the browser and thus fall back to the 'web-loaders' module, which is included
// in the bundle, and therefore will not cause a crash.
if (typeof window === "undefined") {
	window = {};
	__root__.__I_faked_window = true;
}
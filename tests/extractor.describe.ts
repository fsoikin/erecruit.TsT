/// <reference path="../typings/index.d.ts" />
import * as fs from 'fs'
import { createExtractor } from '../src/extractor'
import { CachedConfig } from '../src/config'
import types from './extractor.types'
import classes from './extractor.classes'
import directives from './extractor.directives'
import generics from './extractor.generics'
import modules from './extractor.modules'
import comments from './extractor.comments'
import { state } from './extractor'

describe( "Extractor", () => {

	beforeEach( () => {
		state.file.contents = null;
		state.extraFiles = {};
		state.e = () => createExtractor( <CachedConfig>{
			Original: { RootDir: '.', ConfigDir: '.' },
			File: [{ Match: null, Types: null, Classes: null }],
			NunjucksEnv: null,
			Host: {
				DirectoryExists: _ => false,
				FetchFile: name =>
					( name === 'lib.d.ts' && fs.readFileSync( require.resolve('../src/lib/libdts'), { encoding: 'utf8' } ) ) ||
					( name === state.file.name && state.file.contents ) ||
					state.extraFiles[name] ||
					fs.existsSync( name ) && fs.readFileSync( name, { encoding: 'utf8' })
					|| null,
				GetParentDirectory: _ => "",
				MakeRelativePath: (from, to) => to,
				ResolveRelativePath: (path, directory) => path,
				GetIncludedTypingFiles: () => ['lib.d.ts']
			}
		}, Object.keys( state.extraFiles ).concat( [state.file.name] ) );
	});

	types();
	classes();
	modules();
	generics();
	comments();
	directives();
});

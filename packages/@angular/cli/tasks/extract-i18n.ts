import { join } from 'path';
import * as webpack from 'webpack';
import { AngularCompilerPlugin } from '@ngtools/webpack';
import { XI18nWebpackConfig } from '../models/webpack-xi18n-config';
import { getAppFromConfig } from '../utilities/app-utils';

const Task = require('../ember-cli/lib/models/task');
const MemoryFS = require('memory-fs');


export const Extracti18nTask = Task.extend({
  run: function (runTaskOptions: any) {
    const appConfig = getAppFromConfig(runTaskOptions.app);
    const useExperimentalAngularCompiler = AngularCompilerPlugin.isSupported();

    // We need to determine the outFile name so that AngularCompiler can retrieve it.
    let outFile = runTaskOptions.outFile || getI18nOutfile(runTaskOptions.i18nFormat);
    if (useExperimentalAngularCompiler && runTaskOptions.outputPath) {
      // AngularCompilerPlugin doesn't support genDir so we have to adjust outFile instead.
      outFile = join(runTaskOptions.outputPath, outFile);
    }

    const config = new XI18nWebpackConfig({
      genDir: runTaskOptions.outputPath || appConfig.root,
      buildDir: '.tmp',
      i18nFormat: runTaskOptions.i18nFormat,
      locale: runTaskOptions.locale,
      outFile: outFile,
      verbose: runTaskOptions.verbose,
      progress: runTaskOptions.progress,
      app: runTaskOptions.app,
      aot: useExperimentalAngularCompiler,
    }, appConfig).buildConfig();

    const webpackCompiler = webpack(config);
    webpackCompiler.outputFileSystem = new MemoryFS();

    return new Promise((resolve, reject) => {
      const callback: webpack.compiler.CompilerCallback = (err, stats) => {
        if (err) {
          return reject(err);
        }

        if (stats.hasErrors()) {
          reject();
        } else {
          resolve();
        }
      };

      webpackCompiler.run(callback);
    })
    .catch((err: Error) => {
      if (err) {
        this.ui.writeError('\nAn error occured during the i18n extraction:\n'
          + ((err && err.stack) || err));
      }
    });
  }
});

function getI18nOutfile(format: string) {
  switch (format) {
    case 'xmb':
      return 'messages.xmb';
    case 'xlf':
    case 'xlif':
    case 'xliff':
    case 'xlf2':
    case 'xliff2':
      return 'messages.xlf';
    default:
      throw new Error(`Unsupported format "${format}"`);
  }
}

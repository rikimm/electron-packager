'use strict'

const common = require('../common')
const path = require('path')
const test = require('ava')
const util = require('./_util')

test('asar argument test: asar is not set', t => {
  const asarOpts = common.createAsarOpts({})
  t.false(asarOpts, 'createAsarOpts returns false')
})

test('asar argument test: asar is true', t => {
  t.deepEqual(common.createAsarOpts({ asar: true }), {})
})

test('asar argument test: asar is not an Object or a bool', t => {
  t.false(common.createAsarOpts({ asar: 'string' }), 'createAsarOpts returns false')
})

util.testSinglePlatform('default_app.asar removal test', async (t, opts) => {
  opts.name = 'default_appASARTest'
  opts.dir = util.fixtureSubdir('el-0374')
  opts.electronVersion = '0.37.4'

  const resourcesPath = await util.packageAndEnsureResourcesPath(t, opts)
  await util.assertPathNotExists(t, path.join(resourcesPath, 'default_app.asar'), 'The output directory should not contain the Electron default_app.asar file')
})

async function assertUnpackedAsar (t, resourcesPath) {
  await util.assertDirectory(t, path.join(resourcesPath, 'app.asar.unpacked'), 'app.asar.unpacked should exist under the resources subdirectory when opts.asar_unpack is set')
  await util.assertDirectory(t, path.join(resourcesPath, 'app.asar.unpacked', 'dir_to_unpack'), 'dir_to_unpack should exist under app.asar.unpacked subdirectory when opts.asar-unpack-dir is set dir_to_unpack')
}

util.testSinglePlatform('asar test', async (t, opts) => {
  opts.name = 'asarTest'
  opts.dir = util.fixtureSubdir('basic')
  opts.asar = {
    'unpack': '*.pac',
    'unpackDir': 'dir_to_unpack'
  }

  const resourcesPath = await util.packageAndEnsureResourcesPath(t, opts)
  await Promise.all([
    util.assertFile(t, path.join(resourcesPath, 'app.asar'), 'app.asar should exist under the resources subdirectory when opts.asar is true'),
    util.assertPathNotExists(t, path.join(resourcesPath, 'app'), 'app subdirectory should NOT exist when app.asar is built'),
    assertUnpackedAsar(t, resourcesPath)
  ])
})

util.testSinglePlatform('prebuilt asar test', async (t, opts) => {
  util.setupConsoleWarnSpy()
  opts.name = 'prebuiltAsarTest'
  opts.dir = util.fixtureSubdir('asar-prebuilt')
  opts.prebuiltAsar = path.join(opts.dir, 'app.asar')
  opts.asar = {
    'unpack': '*.pac',
    'unpackDir': 'dir_to_unpack'
  }
  opts.ignore = ['foo']
  opts.prune = false
  opts.derefSymlinks = false

  const resourcesPath = await util.packageAndEnsureResourcesPath(t, opts)
  util.assertWarning(t, 'WARNING: prebuiltAsar has been specified, all asar options will be ignored')
  for (const incompatibleOption of ['ignore', 'prune', 'derefSymlinks']) {
    util.assertWarning(t, `WARNING: prebuiltAsar and ${incompatibleOption} are incompatible, ignoring the ${incompatibleOption} option`)
  }

  await util.assertFile(t, path.join(resourcesPath, 'app.asar'), 'app.asar should exist under the resources subdirectory when opts.prebuiltAsar points to a prebuilt asar')
  await util.assertFilesEqual(t, opts.prebuiltAsar, path.join(resourcesPath, 'app.asar'), 'app.asar should equal the prebuilt asar')
  await util.assertPathNotExists(t, path.join(resourcesPath, 'app'), 'app subdirectory should NOT exist when app.asar is built')
})

function testFailedPrebuiltAsar (name, extraOpts, errorRegex) {
  const dir = util.fixtureSubdir('asar-prebuilt')
  util.testSinglePlatform(`prebuilt asar: fail on ${name}`, util.invalidOptionTest({
    name: 'prebuiltAsarFailingTest',
    dir: dir,
    prebuiltAsar: path.join(dir, 'app.asar'),
    ...extraOpts
  }, errorRegex))
}

function testIncompatibleOptionWithPrebuiltAsar (extraOpts) {
  testFailedPrebuiltAsar(`specifying prebuiltAsar and ${Object.keys(extraOpts).join(',')}`, extraOpts, /is incompatible with prebuiltAsar/)
}

testFailedPrebuiltAsar('prebuiltAsar set to directory', { prebuiltAsar: util.fixtureSubdir('asar-prebuilt') }, /must be an asar file/)
testIncompatibleOptionWithPrebuiltAsar({ afterCopy: [] })
testIncompatibleOptionWithPrebuiltAsar({ afterPrune: [] })

const Promise = require('bluebird')
const path = require('path')
const fs = Promise.promisifyAll(require('fs'))

const mkdirp = require('mkdirp')
const mkdirpAsync = Promise.promisify(mkdirp)
const rimraf = require('rimraf')
const rimrafAsync = Promise.promisify(rimraf)

const { untar } = require('./lib/tarball')
const { probeAppBalls } = require('./lib/appball')
const Model = require('./models')

const untarAsync = Promise.promisify(untar)
const probeAppBallsAsync = Promise.promisify(probeAppBalls)

// pick .release.json
const probeAppifi = (dir, callback) => 
  fs.readFile(path.join(dir, '.release.json'), (err, data) => {
    if (err) return callback(err)
    try {
      callback(null, JSON.parse(data))
    } catch (e) {
      callback(e)
    }
  })

const probeAppifiAsync = Promise.promisify(probeAppifi)

const initAsync = async (root, githubUrl) => {

  let appifiDir = path.join(root, 'appifi')
  let appBallsDir = path.join(root, 'appifi-tarballs')
  let tmpDir = path.join(root, 'tmp')

  await mkdirpAsync(root)
  await mkdirpAsync(appifiDir)  
  await mkdirpAsync(appBallsDir)

  // useless and harmless
  let config = {}
  try {
    let raw = fs.readFileSync(path.join(root, 'bootstrap.config.json'))
    config = JSON.parse(raw)
  } catch (e) {
    if (e.code !== 'ENOENT') {
      console.log('WARNING error loading bootstrap.config.json', e)
    }
  }

  // load local tarballs
  let appBalls = await probeAppBallsAsync(appBallsDir)

  let tagName, isBeta
  try {
    // detect working directory
    let release = await probeAppifiAsync(appifiDir)

    console.log('deployed release', release)

    if (release) {
      let localTagNames = appBalls.map(ball => ball.local.tag_name)
      if (localTagNames.includes(release.tag_name)) {
        tagName = release.tag_name
        isBeta = release.prerelease
      } else {
        throw new Error('current tag name not found')
      }
    } 
  } catch (e) {
    console.log(e)
    await rimrafAsync(appifiDir)
    await mkdirpAsync(appifiDir)
  }

  // may be for developers using source code to start 
  const useGlobalNode = !!process.argv.includes('--global-node')

  console.log('initAsync')
  console.log('root', root)
  console.log('githubUrl', githubUrl)
  console.log('appBalls', appBalls)
  console.log('tagName', tagName)
  console.log('isBeta', isBeta)
  console.log('useGlobalNode', useGlobalNode) 

  return new Model(root, githubUrl, appBalls, tagName, isBeta, useGlobalNode)
}

const init = (root, githubUrl, callback) => initAsync(root, githubUrl)
  .then(model => callback(null, model))
  .catch(e => callback(e))

module.exports = init


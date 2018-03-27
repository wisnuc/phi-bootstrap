const Promise = require('bluebird')
const path = require('path')
const fs = Promise.promisifyAll(require('fs'))
const child = require('child_process')
const EventEmitter = require('events')

const rimraf = require('rimraf')
const rimrafAsync = Promise.promisify(rimraf)
const mkdirp = require('mkdirp')
const mkdirpAsync = Promise.promisify(mkdirp)

const sinon = require('sinon')
const expect = require('chai').expect

const Appifi = require('src/models/appifi')

const cwd = process.cwd()
const tmptest = path.join(cwd, 'tmptest') 

const appBallsDir = path.join(tmptest, 'appifi-tarballs')
const appifiDir = path.join(tmptest, 'appifi')
const tmpDir = path.join(tmptest, 'tmp')

const mctx = Object.assign(new EventEmitter(), {
  nodePath: () => 'node',
  tmpDir,
  appBallsDir,
  appifiDir
})

describe(path.basename(__filename), () => {

  let clock

  beforeEach(() => {
    rimraf.sync(tmptest)
    mkdirp.sync(appBallsDir)
    mkdirp.sync(path.join(appifiDir, 'build'))
    mkdirp.sync(tmpDir)
    clock = sinon.useFakeTimers()
  })

  afterEach(() => {
    // mctx.removeAllListeners()
    clock.restore()
  })

  it('create and destroy appifi, 2b54e072', done => {
    const fakeScript = `setInterval(() => console.log('tick'), 1000)`
    fs.writeFileSync(path.join(appifiDir, 'build', 'app.js'), fakeScript)

    const tagName = '0.9.14'
    let appifi = new Appifi(mctx, tagName)
    expect(appifi.ctx).to.equal(mctx)
    expect(appifi.tagName).to.equal(tagName)
    expect(appifi.appifiDir).to.equal(mctx.appifiDir)
    expect(appifi.getState()).to.equal('Starting')
    expect(appifi.startCbs).to.deep.equal([])
    expect(appifi.stopCbs).to.deep.equal([])
    appifi.destroy()
    expect(appifi.getState()).to.equal('Starting')
    expect(appifi.state.appifi).to.be.null
    expect(appifi.state.timer).to.be.null
    done()
  }) 

  it('Starting -> Started by timeout (8s), 52b59a41', function (done) {
    const fakeScript = `setInterval(() => console.log('tick'), 1000)`
    fs.writeFileSync(path.join(appifiDir, 'build', 'app.js'), fakeScript)

    const tagName = '0.9.14'
    let appifi = new Appifi(mctx, tagName)

    appifi.on('Started', () => {
      expect(appifi.getState()).to.equal('Started')
      appifi.destroy()
      done()
    })

    clock.tick(8000)
  }) 

  it('Starting -> Started by message, 7ad81654', function (done) {
    const fakeScript = 
      `setInterval(() => console.log('tick'), 1000), setTimeout(() => process.send('started'), 1000)`
    fs.writeFileSync(path.join(appifiDir, 'build', 'app.js'), fakeScript)

    const tagName = '0.9.14'
    let appifi = new Appifi(mctx, tagName)

    appifi.on('Started', () => {
      expect(appifi.getState()).to.equal('Started')
      appifi.destroy()
      done()
    })
  }) 

  it('Starting, unexpected exit, 96458270', done => {
    const fakeScript = `setTimeout(() => process.exit(1), 500)`
    fs.writeFileSync(path.join(appifiDir, 'build', 'app.js'), fakeScript)
 
    const tagName = '0.9.14' 
    let appifi = new Appifi(mctx, tagName)

    appifi.on('Failed', () => {
      expect(!!appifi.state.error).to.be.true
      expect(!!appifi.state.timer).to.be.true
      appifi.destroy()
      done()
    })

  }) 

  it('stop @ Starting state >> Stopped, d3ab633b', done => {
    const fakeScript = `setInterval(() => console.log('tick'), 1000)`
    fs.writeFileSync(path.join(appifiDir, 'build', 'app.js'), fakeScript)

    const tagName = '0.9.14'   
    let appifi = new Appifi(mctx, tagName)

    appifi.on('Stopped', () => (appifi.destroy(), done()))
    clock.restore()    
    setImmediate(() => appifi.state.stop())
  }) 
})


/**
Stopped -> Starting -> Started (unexpected exit)
Stopped -> Starting -> Started (kill)
**/

/**
describe(path.basename(__filename) + ' start-stop', () => {

  beforeEach(() => {
    rimraf.sync(tmptest)
    mkdirp.sync(appBallsDir)
    mkdirp.sync(appifiDir)
    mkdirp.sync(tmpDir)
  })

  it('Stopped -> Starting (kill), 786874fb', function (done) {
    this.timeout(30000)

const fakeScript = `setInterval(() => console.log('tick'), 1000)`

    let tarball = 'testdata/appifi-0.9.14-8501308-c8ffd8ab-rel.tar.gz'
    child.execSync(`tar xzf ${tarball} -C ${appifiDir}`)
    let appPath = path.join(appifiDir, 'build', 'app.js')
    fs.writeFileSync(appPath, fakeScript)

    let appifi = new Appifi(mctx)
    appifi.once('Stopped', () => {
      appifi.state.setState('Starting')
      setTimeout(() => {
        appifi.state.kill()

        appifi.once('Stopped', () => done())

      }, 1000)
    })
  }) 

  it('Stopped -> Starting -> Started (unexpected exit), 01211d54', function (done) {
    this.timeout(30000)

const fakeScript = `
setInterval(() => console.log('tick'), 1000)
setTimeout(() => process.send('child started'), 1000)
setTimeout(() => process.exit(1), 3000)
`

    let tarball = 'testdata/appifi-0.9.14-8501308-c8ffd8ab-rel.tar.gz'
    child.execSync(`tar xzf ${tarball} -C ${appifiDir}`)
    let appPath = path.join(appifiDir, 'build', 'app.js')
    fs.writeFileSync(appPath, fakeScript)

    let appifi = new Appifi(mctx)
    appifi.once('Stopped', () => {
      appifi.state.setState('Starting') 
      appifi.on('Starting', () => {
        console.log('Appifi starting again and again')
      })
    })
  })

  it('Stopped -> Starting -> Started (kill), 9e2a38e2', function (done) {
    this.timeout(30000)

const fakeScript = `
setInterval(() => console.log('tick'), 1000)
setTimeout(() => process.send('child started'), 1000)
`

    let tarball = 'testdata/appifi-0.9.14-8501308-c8ffd8ab-rel.tar.gz'
    child.execSync(`tar xzf ${tarball} -C ${appifiDir}`)
    let appPath = path.join(appifiDir, 'build', 'app.js')
    fs.writeFileSync(appPath, fakeScript)

    let appifi = new Appifi(mctx)
    appifi.once('Stopped', () => {
      appifi.state.setState('Starting')
     
      appifi.on('Started', () => {
        setImmediate(() => {
          appifi.state.kill()

          appifi.once('Stopped', () => done())
        })
      }) 
    })
  }) 

})
**/



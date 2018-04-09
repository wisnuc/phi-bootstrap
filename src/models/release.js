const path = require('path')
const fs = require('fs')
const EventEmitter = require('events')

const rimraf = require('rimraf')
const mkdirp = require('mkdirp')
const UUID = require('uuid')

const Download = require('../lib/download')
const { inject, cherryPick } = require('../lib/tarball')
const { parseTagName, appBallName } = require('../lib/appball') 
const Base = require('./state')

class State extends Base {
  start () {}
  stop () {}

  destroy () { 
    this.exit() 
  }

  view () { return null }
}

// has local, with or without remote
class Ready extends State {

  enter (props = {}) {
    super.enter()
    Object.assign(this.ctx, props)
    this.ctx.ctx.reqSchedule()
  }

  // start/stop is meaningless, nothing to destroy
}


// stopped, no local
class Idle extends State { 

  start () {
    this.setState('Downloading')
  }

  // already stopped, nothing to destroy
}

// stop working manually, should start manually if wanted
class Stopped extends State {
  start () {
    this.setState('Downloading')
  }
}

// timeout to download 
class Failed extends State {

  enter (err) {
    super.enter()
    this.error = err
    this.startTime = new Date().getTime()
    this.timeout = 3600 * 1000
    this.timer = setTimeout(() => this.state.setState('Downloading'), this.timeout)
  }

  exit () {
    clearTimeout(this.timer)
    super.exit()
  }

  view () {
    return {
      startTime: this.startTime,
      timeout: this.timeout,
      message: this.error.message,
      code: this.error.code
    }
  }

  /**
  Instantly go to Downloading if `instant` is true. 
  Otherwise, Failed is considered to be a started state. 
  In contrary to Idle, it WILL start in future and hence is a live/transient state.
  @param {boolean} instant - whether go to Downloading state instantly 
  */
  start (instant) {
    if (instant) this.setState('Downloading')
  }

  stop () {
    this.setState('Idle')
  }

}

class Downloading extends State {
/**
  enter () {
    super.enter()

    this.tmpFile = path.join(this.ctx.tmpDir, UUID.v4())
    this.download = download(this.ctx.remote.tarball_url, this.tmpFile, err => {
      this.download = null  
      if (err) {
        rimraf(this.tmpFile, () => {})
        this.setState('Failed', err)
      } else {
        this.setState('Repacking', this.tmpFile)
      }
    })
  }
*/

  enter() {
    super.enter()
    this.tmpFile = path.join(this.ctx.tmpDir, UUID.v4())
    this.download = new Download(this.ctx.remote.tarball_url, this.tmpFile)

    this.download.on('error', err => {
      this.download = null
      rimraf(this.tmpFile, () => {})
      this.setState('Failed', err)
    })

    this.download.on('finished', () => {
      this.download = null
      this.setState('Repacking', this.tmpFile)
    })
  }

  exit () {
    if (this.download) {
      this.download.destroy()
      rimraf(this.tmpFile, () => {})
    }
    super.exit()
  }

  stop () {
    this.setState('Stopped')
  }

  view () {
    return {
      length: this.download.length || null, 
      bytesWritten: this.download.bytesWritten()
    }
  }
}

class Repacking extends State {

  enter (tmpFile) {
    super.enter()

    this.oldPath = tmpFile
    this.newPath = path.join(this.ctx.tmpDir, UUID.v4())

    this.inject = inject(this.oldPath, this.newPath, '.release.json', JSON.stringify(this.ctx.remote), err => {
      this.inject = null
      if (err) {
        this.setState('Failed', err)
      } else {
        this.setState('Verifying', this.newPath)
      }
     
    }) 
  }

  exit () {
    // TODO    
    if (this.inject) this.inject.destroy()
    rimraf(this.oldPath, () => {})
    super.exit()
  }

  // FIXME clean resources
  stop () {
    this.setState('Stopped')
  }
}

class Verifying extends State {

  enter (tmpFile) {
    super.enter()

    this.tmpFile = tmpFile

    cherryPick(tmpFile, './.release.json', (err, data) => {
      if (err || !data) return this.setState('Failed', err)
      let local
      try {
        local = JSON.parse(data)
      } catch (e) {
        let err = new Error('error parsing cherry-picked .release.json')
        this.setState('Failed', err)
      }

      cherryPick(tmpFile, './package.json', (err, data) => {
        if (err || !data) return this.setState('Failed', err)
        try {
          let config = JSON.parse(data)
          let ballName = appBallName(this.ctx.remote)
          let ballPath = path.join(this.ctx.appBallsDir, ballName)

          fs.rename(tmpFile, ballPath, err => {
            if (err) {
              this.setState('Failed', err)
            } else {
              this.setState('Ready', { path: ballPath, local, config })
            }
          })

        } catch (e) {
          this.setState('Idle', e)
        }
      })
    })
  }

  exit () {
    rimraf(this.tmpFile, () => {}) 
    super.exit()
  }

  // FIXME clean resources
  stop () {
    this.setState('Stopped')
  }
}


/**
{ path: '/home/wisnuc/appifi-bootstrap/tmptest/appifi-0.9.14-8501308-c8ffd8ab-rel.tar.gz',
  local: 
   { url: 'https://api.github.com/repos/wisnuc/appifi-release/releases/8501308',
     assets_url: 'https://api.github.com/repos/wisnuc/appifi-release/releases/8501308/assets',
     upload_url: 'https://uploads.github.com/repos/wisnuc/appifi-release/releases/8501308/assets{?name,label}',
     html_url: 'https://github.com/wisnuc/appifi-release/releases/tag/0.9.14',
     id: 8501308,
     tag_name: '0.9.14',
     target_commitish: 'c8ffd8ab973c916f88c14e4df47292e2bc0d71a3',
     name: 'fix hash stream NOMEM',
     draft: false,
     author: [Object],
     prerelease: false,
     created_at: '2017-11-14T00:45:57Z',
     published_at: '2017-11-14T00:47:23Z',
     assets: [],
     tarball_url: 'https://api.github.com/repos/wisnuc/appifi-release/tarball/0.9.14',
     zipball_url: 'https://api.github.com/repos/wisnuc/appifi-release/zipball/0.9.14',
     body: '' },
  config: 
   { name: 'appifi',
     version: '0.9.0',
     private: true,
     scripts: [Object],
     dependencies: [Object],
     devDependencies: [Object],
     wisnuc: [Object] } }
*/

// a release can be created by a local ball object
// or a remote release
class Release extends EventEmitter {

  // ctx is the model
  constructor(ctx, props) {
    super()
    this.ctx = ctx
    this.tmpDir = ctx.tmpDir
    this.appBallsDir = ctx.appBallsDir
    Object.assign(this, props)

    if (this.local) {
      new Ready(this)
    } else {
      new Idle(this)
    }
  }

  getState() {
    return this.state.constructor.name
  }

  isBeta () {
    return this.remote 
      ? this.remote.prerelease
      : this.local.prerelease
  }

  tagAttr () {
    return parseTagName(this.tagName())
  }

  tagName () {
    return this.remote
      ? this.remote.tag_name
      : this.local.tag_name
  }

  tagValue () {
    return this.tagAttr().value 
  }

  // it is possible that the local is created first
  setRemote (remote) {
    this.remote = remote
  }

  start () {
    this.state.start()
  }

  stop () {
    this.state.stop()
  }

  view () {
    return {
      state: this.getState(),
      view: this.state.view(),
      remote: this.remote || null,
      local: this.local || null
    }
  }
}

Release.prototype.Idle = Idle
Release.prototype.Ready = Ready
Release.prototype.Failed = Failed
Release.prototype.Downloading = Downloading
Release.prototype.Repacking = Repacking
Release.prototype.Verifying = Verifying
Release.prototype.Stopped = Stopped

module.exports = Release



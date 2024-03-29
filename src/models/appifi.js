const Promise = require('bluebird')
const path = require('path')
const fs = require('fs')
const child = require('child_process')
const EventEmitter = require('events')

const rimraf = require('rimraf')
const mkdirp = require('mkdirp')

const debug = require('debug')('bootstrap:appifi')

/**
nexe does not work properly for unknown reason.
*/
class State {

  constructor(ctx, ...args) {
    this.ctx = ctx
    ctx.state = this
    this.enter(...args)

    if (ctx instanceof EventEmitter) ctx.emit(this.constructor.name)
  }

  setState (state, ...args) {
    this.exit()
    new this.ctx[state](this.ctx, ...args)
  }

  enter () {
    debug(`${this.ctx.constructor.name} enter ${this.constructor.name} state`)
  }

  exit () {
    debug(`${this.ctx.constructor.name} exit ${this.constructor.name} state`)
  }

  destroy () {
    if (this.appifi) {
      this.appifi.removeAllListeners()
      this.appifi.on('error', () => {})
      this.appifi.kill()
      this.appifi = null
    }

    this.exit()
  }

  start () {}

  stop () {}

  view () { return null }

}


class Stopped extends State {

  start () {
    this.setState('Starting')
  }
}

class Starting extends State {

  enter () {
    super.enter()

    const opts = {
      cwd: this.ctx.appifiDir,

      /**
      node must be in path, for there is no global node in future
      */
      env: Object.assign({}, process.env, { 
        PATH: `/phi/node/base/bin:${process.env.PATH}`,
        NODE_ENV: 'production' 
      }),
      stdio: ['ignore', 'inherit', 'inherit', 'ipc'] 
    }
    let appPath = path.join(this.ctx.appifiDir, 'build', 'app.js')
    let args = [appPath, ...process.argv.slice(2)]

    this.appifi = child.spawn(this.ctx.nodePath(), args, opts)
    this.appifi.on('error', err => console.log('Appifi Error in Starting: neglected', err))
    this.appifi.on('message', message => (this.ctx.emit('message', message), this.setState('Started', this.appifi)))
    this.appifi.on('close', (code, signal) => (this.appifi = null, this.setState('Failed', { code, signal })))
  }

  stop () {
    this.setState('Stopping', this.appifi)
  }

  exit () {
    if (this.appifi) this.appifi.removeAllListeners()
    clearTimeout(this.timer)
    this.timer = null
    super.exit()
  }

}

class Started extends State {

  enter (appifi) {
    super.enter()

    this.appifi = appifi
    this.appifi.on('error', err => console.log('Appifi Error in Started: neglected', err))
    this.appifi.on('close', (code, signal) => (this.appifi = null, this.setState('Failed', { code, signal})))
    this.appifi.on('message', message => this.ctx.emit('message', message))
    // this.ctx.ctx.emit('appifiStarted')
  }

  stop () {
    this.setState('Stopping', this.appifi)
  }

  exit () {
    if (this.appifi) this.appifi.removeAllListeners()
    super.exit()
  }

}

// Stopping can only be entered when being stopped externally, so it always goes to Stopped state
class Stopping extends State {

  enter (appifi) {
    super.enter()
    appifi.kill()
    appifi.on('error', err => console.log('Appifi Error in Started: neglected', err))
    appifi.on('close', (code, signal) => this.setState('Stopped'))
  }

}

// Failed and Started are XOR destination of start operation
class Failed extends State {

  enter (err) {
    super.enter()
    this.error = err
    this.timer = setTimeout(() => this.setState('Starting'), 100) 

    // failed can only be landed for start request
    this.ctx.startCbs.forEach(cb => cb(this.error))
    this.ctx.startCbs = []
  }

  start () {
    this.setState('Starting')
  }

  stop () {
    this.setState('Stopped')
  }

  exit () {
    clearTimeout(this.timer) 
    this.timer = null
    super.exit()
  }
}

class Appifi extends EventEmitter {

  /**
  Create Appifi
  @param {object} ctx - the model. ctx.releases is guaranteed to be available.
  @param {string} tagName - the currently deployed version
  */
  constructor(ctx, tagName) {
    super()
    this.ctx = ctx
    this.tagName = tagName
    this.appifiDir = ctx.appifiDir

    // mutual exclusive
    this.startCbs = []
    this.stopCbs = []

    new Starting(this)
  }

  getState() {
    return this.state.constructor.name
  }

  nodePath () {
    return this.ctx.nodePath()
  }

  isBeta () {
    return this.ctx.releases.find(r => r.tagName() === this.tagName).isBeta()
  }

  // start may land started or failed
  start (callback = () => {}) {
    if (this.stopCbs.length) {
      let err = new Error('appifi is requested to stop')
      err.code = 'ERACE'
      process.nextTick(() => callback(err))
      return
    }

    if (this.getState() === 'Started') {
      process.nextTick(() => callback(null))
      return
    }

    if (!this.startCbs.length) {
      const f = err => (this.startCbs.forEach(cb => cb(err)), this.startCbs = [])
      const startedHandler = () => (this.removeListener('Failed', failedHandler), f(null))
      const failedHandler = () => (this.removeListener('Started', startedHandler), f(this.state.error))
      this.once('Started', startedHandler)
      this.once('Failed', failedHandler)
      process.nextTick(() => this.state.start())
    }

    this.startCbs.push(callback)
  }

  async startAsync () {
    return new Promise((res, rej) => this.start(err => err ? rej(err) : res(null)))
  }

  // stop may land stopped
  stop (callback = () => {}) {
    if (this.startCbs.length) {
      let err = new Error('appifi is requested to start')
      err.code = 'ERACE'
      process.nextTick(() => callback(err))
      return
    }

    if (this.getState() === 'Stopped') {
      process.nextTick(() => callback(null))
      return
    }

    if (!this.stopCbs.length) {
      this.once('Stopped', () => (this.stopCbs.forEach(cb => cb(null)), this.stopCbs = []))
      process.nextTick(() => this.state.stop())
    }

    this.stopCbs.push(callback)
  }

  async stopAsync () {
    return new Promise((res, rej) => this.stop(err => err ? rej(err) : res(null)))
  }

  sendMessage(obj) {
    let message
    try {
      message = JSON.stringify(obj)
    } catch (error) {
      console.log('[APPIFI]warning :', error, message)
      return
    }
    if(!this.state.appifi) 
      return console.log(`[APPIFI]warning : appifi in ${ this.state.constructor.name } state`)
    debug('*******Send To Appifi*******\n', message)
    this.state.appifi.send && this.state.appifi.send(message)
  }

  view () {
    return {
      state: this.getState(),
      tagName: this.tagName,
      isBeta: this.isBeta()
    }
  }

  destroy () {
    this.state.destroy()

    let err = new Error('app is destroyed')
    err.code = 'EDESTROYED'
    
    this.startCbs.forEach(cb => cb(err))
    this.stopCbs.forEach(cb => cb(err))
    this.startCbs = []
    this.stopCbs = []
  }
}

Appifi.prototype.Stopped = Stopped
Appifi.prototype.Starting = Starting
Appifi.prototype.Started = Started
Appifi.prototype.Stopping = Stopping
Appifi.prototype.Failed = Failed

module.exports = Appifi

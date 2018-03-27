const child = require('child_process')
const EventEmitter = require('events')
const debug = require('debug')('deb')

class State {

  constructor(ctx, ...args) {
    this.ctx = ctx
    ctx.state = this
    this.enter(...args)
    if (ctx instanceof EventEmitter) {
      console.log(`[DEB] state: ${this.constructor.name}`)
      ctx.emit(this.constructor.name)
    }
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

  view () {
    return null
  }

  destroy () {
    this.exit()
  }

  add (name) {
    if (this.ctx.preq.find(preq => preq.name === name)) return 
    this.ctx.preqs.push({ name, installed: false })
  }

  view () {
    return {
      name: this.constructor.name
    }
  }

  opts () {
    return {
      detached: true,
      stdio: this.ctx.testing ? 'inherit' : 'ignore' 
    }
  }
}

/**
This is the first state 
*/
class AptUpdate extends State {

  enter () {
    this.update = child.spawn('apt', ['update'], this.opts())

    this.update.on('error', err => {
      console.log('[DEB] apt update error: ', err.message)
      this.setState('AptUpdatePending')
    })

    this.update.on('close', (code, signal) => {
      this.update = null
      if (code === 0) {                         // success
        if (this.ctx.preqs.every(preq => preq.installed)) { 
          this.setState('Stopped')
        } else {
          this.setState('Installing')
        }
      } else {
        console.log(`[DEB] apt update failed with code ${code}, signal ${signal}`)
        this.setState('AptUpdatePending') 
      }
    })
  }

  exit () {
    if (this.update) {
      this.update.removeAllListeners()
      this.update.on('error', () => {})
      this.update.unref()
    }
  }

}

/**
Falling into this state if AptUpdate fails.
*/
class AptUpdatePending extends State {

  enter () {
    this.startTime = new Date().getTime()
    this.duration = 30 * 60 * 1000
    this.timer = setTimeout(() => this.setState('AptUpdate'), this.duration) // 30 minutes
  }

  exit () {
    clearTimeout(this.timer)
  }

  view () {
    return Object.assign(super.view(), {
      startTime: this.startTime,
      duration: this.duration
    })
  }
}


/**
When all prerequisite installed
*/
class Stopped extends State {

  add (name) {
    super.add(name)
    this.setState('Installing')
  }
}

// Pending state has a timer, waiting for next job
// it goes to either Update state for apt-update, or Install state for apt-install
class Pending extends State {

  enter () {
    this.startTime = new Date().getTime()
    this.duration = 30 * 60 * 1000
    this.timer = setTimeout(() => this.setState('Installing'), this.duration) // 30 minutes
  }

  exit () {
    clearTimeout(this.timer)
  }

  view () {
    return Object.assign(super.view(), {
      startTime: this.startTime,
      duration: this.duration
    })
  }
}

// Not used
const dpkgOutputImpliesInstalled = output => !!output
  .split('\n')
  .filter(l => l.length)
  .map(l => l.trim())
  .find(l => l.startsWith('Status:') && l.endsWith('installed'))

// Iterate through preqs list, try install, skip failed.
class Installing extends State {

  enter () {
    this.index = 0
    process.nextTick(() => this.next())
  }

  next () {

    // finished
    if (this.index >= this.ctx.preqs.length) {
      if (this.ctx.preqs.every(preq => preq.installed)) {
        this.setState('Stopped')
      } else {
        this.setState('Pending')
      }
    } else if (this.ctx.preqs[this.index].installed) { // skip

      console.log(`[DEB] ${this.ctx.preqs[this.index].name} already installed, skipped`)

      this.index++
      this.timer = setTimeout(() => this.next(), 1000)
    } else {

      let name = this.ctx.preqs[this.index].name

      console.log(`[DEB] detecting/installing ${name}`)

      /**
      We don't check if a package is already installed, which is error-prone.
      We just install it anyway.
      */
      this.sub = child.spawn('apt', ['-y', 'install', name], this.opts())
      this.sub.on('error', err => {

        console.log(`[DEB] error installing ${name}`, err.message)

        this.sub.removeAllListeners() 
        this.sub.on('error', () => {})
        this.sub.unref()
        this.sub = null
        this.index++
        this.timer = setTimeout(() => this.next(), 3000)
      })

      this.sub.on('close', (code, signal) => {
        this.sub = null
        if (code === 0) {
          console.log(`[DEB] ${name} installed`)
          this.ctx.preqs[this.index].installed = true
        } else {
          console.log(`[DEB] failed to install ${name}`)
        }

        this.index++
        this.timer = setTimeout(() => this.next(), 1000)
      })
    }
  } 

  exit () {
    clearTimeout(this.timer)
    if (this.sub) {
      this.sub.removeAllListeners()
      this.sub.on('error', () => {})
      this.sub = null
    }
  }

  view () {
    return Object.assign(super.view(), { index: this.index })
  }
}

class Deb extends EventEmitter {

  constructor(names = [], testing) {
    super()

    /**
    A collection of objects.
    { 
      name: package name
      installed: true or false
    }
    */
    this.preqs = names.map(name => ({ name, installed: false }))
    this.testing = !!testing
    this.state = new AptUpdate(this)
  }

  /**
  add prerequisites
  */
  add (name) {
    this.state.add(name)
  }

  view () {
    return {
      preqs: this.preqs.map(preq => Object.assign({}, preq)),
      state: this.state.view()
    }
  }
}

Deb.prototype.AptUpdate = AptUpdate
Deb.prototype.AptUpdatePending = AptUpdatePending
Deb.prototype.Stopped = Stopped
Deb.prototype.Pending = Pending
Deb.prototype.Installing = Installing

module.exports = Deb


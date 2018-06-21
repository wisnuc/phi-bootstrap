const EventEmitter = require('events').EventEmitter
const fs = require('fs')
const path = require('path')
const child = require('child_process')

const debug = require('debug')('bootstrap:device')

/** fake power event file, if read file return 1, pass power auth */
const POWER_EVENT = path.join('/phi/power')

/* fake led event file, write led state to file */
const LED_EVENT = path.join('/phi/led')

class LedBase {
  constructor(ctx, ...args) {
    this.ctx = ctx
    ctx.ledState = this
    this.enter(...args)

    if (ctx instanceof EventEmitter) {
      ctx.emit(this.constructor.name)
    }
  }

  setState (state, ...args) {
    this.exit()
    let NextState = this.ctx[state]
    new NextState(this.ctx, ...args)
  }

  enter () {
    debug(`${this.ctx.constructor.name} enter ${this.constructor.name} state`)
  }

  exit () {
    debug(`${this.ctx.constructor.name} exit ${this.constructor.name} state`)
  }

  changeLedState(state) {
    this.setState(state, this.constructor.name)
  }

  writeState (state) {
    debug(`${this.constructor.name} writeState ${state}`)
  }

  quit () {

  }

  currentState () {
    return this.constructor.name
  }

  view () {
    return {
      state: this.constructor.name
    }
  }

  destroy () {
    this.exit()
  }
}

/* led to idle state */
class LedIdle extends LedBase {

  enter () {
    super.enter()
    this.writeState(this.constructor.name)
  }

}

/* led to auth state */
class LedAuth extends LedBase {

  enter (outState) {
    super.enter()

    // notify observer
    let enterListeners = this.ctx.enterAuthListeners 
    //clear enter listeners
    this.ctx.enterAuthListeners = null
    if(Array.isArray(enterListeners))
      enterListeners.forEach(x => {
        clearTimeout(x[0])
        x[1](null, true)
      })
    
    this.outState = outState
    this.writeState(this.constructor.name)
    this.timer = setTimeout(() => {
      this.setState(outState)
    }, 30 * 1000)
  }

  changeLedState(state) {
    if(state === this.constructor.name) return
    this.outState = state
  }
  
  quit () {
    this.setState(this.outState)
  }

  exit () {
    clearTimeout(this.timer)
    let exitAuthListeners = this.ctx.exitAuthListeners
    this.ctx.exitAuthListeners = null
    if(Array.isArray(exitAuthListeners))
      exitAuthListeners.forEach(x => {
        clearTimeout(x[0])
        x[1](null, true)
      })
    super.exit()
  }
}

/* led to busy state */
class LedBusy extends LedBase {

  enter () {
    super.enter()
    this.writeState(this.constructor.name)
  }
}

/**
 * device module control all device interface
 * change led state
 * listen power button
 * if ctx.useFakeDevice true, polling POWER_EVENT file and write led state to LED_EVENT
 */
class Device {

  constructor(ctx) {
    this.ctx = ctx
    new LedIdle(this)
  }

  addEnterAuthListener(callback) {
    if (this.ledState.currentState() === 'LedAuth') return callback(null, true)
    else {
      let timer = setTimeout(() => {
        let index = this.enterAuthListeners.findIndex(x => x === obj)
        if(index !== -1)
          this.enterAuthListeners = [...this.enterAuthListeners.slice(0, index), ...this.enterAuthListeners.slice(index + 1)]
        callback(null, false)
      }, 10 * 1000)
      let obj = [timer, callback]
      Array.isArray(this.enterAuthListeners) ? this.enterAuthListeners.push(obj) : this.enterAuthListeners = [obj]
    }
  }

  addExitAuthListener(callback) {
    let timeout = this.ledState.currentState() === 'LedAuth' ? 30 * 1000 : 40 * 1000
    let timer = setTimeout(() => {
      let index = this.exitAuthListeners.findIndex(x => x === obj)
        if(index !== -1)
          this.exitAuthListeners = [...this.exitAuthListeners.slice(0, index), ...this.exitAuthListeners.slice(index + 1)]
        callback(null, false)
    }, timeout)
    let obj = [timer, callback]
    Array.isArray(this.exitAuthListeners) ? this.exitAuthListeners.push(obj) : this.exitAuthListeners = [obj]
  }
  
  requestAuth (timeout, callback) {
    if (this.ledState.currentState() === 'LedAuth') return callback(new Error('state Busy'))
    this.ledState.changeLedState('LedAuth')
    this.pollingPowerButton(timeout, (err, isAuth) => {
      this.ledState.quit()
      callback(err, !!isAuth)
    })
  }

  // =>   /usr/bin/inotifywait -mrq --timefmt '%Y/%m/%d-%H:%M:%S' --format '%T %w %f' -e attrib /etc/button/
  pollingPowerButton(timeout, callback) {
    if (this.ctx.useFakeDevice) { // not n2
      let exit = (err, isAuth) => {
        clearInterval(loopTimer)
        clearTimeout(timeoutTimer)
        callback(err, isAuth)
      }
      
      let loopTimer = setInterval(() => {
        fs.readFile(POWER_EVENT, (err, data) => {
          if(err) return exit(err)
          let read = data.toString().trim()
          if(parseInt(read) === 1) 
            return exit(null, true)
        })
      }, 500)

      let timeoutTimer = setTimeout(() => exit(null, false), timeout)
    } else { // n2
      if (this.spawn) {
        this.spawn.kill()
        this.spawn = undefined
      }
      let finished = false
      let exit = (err, isAuth) => {
        if (finished) return
        finished = true
        clearTimeout(timeoutTimer)
        this.spawn.removeAllListeners()
        this.spawn.on('error', () => {})
        this.spawn.kill()
        this.spawn = undefined
        callback(err, isAuth)
      }
      this.spawn = child.spawn('/usr/bin/inotifywait', ['-mrq', '--timefmt', '"%Y/%m/%d-%H:%M:%S"', '--format', '"%T %w %f"', '-e', 'attrib', '/etc/button/'])   
      this.spawn.stdout.on('data', data => (debug(data), exit(null, true)))
      this.spawn.stderr.on('data', data => debug('[WARNING] ' + data))
      this.spawn.on("close", () => (debug('spawn close'), exit(null, false)))
      this.spawn.on("disconnect", () => (debug('spawn disconnect'), exit(null, false)))
      this.spawn.on("error", err => (debug('spawn error', err.message), exit(err, false)))
      this.spawn.on("exit", (code, signal) => exit(null, false))
      let timeoutTimer = setTimeout(() => exit(null, false), timeout)
    }
  }

  updateLed(state) {
    this.ledState.changeLedState(state)
  }

  destroy () {
    if (this.spawn) {
      this.spawn.kill()
      this.spawn = undefined
    }
  }
}

Device.prototype.LedAuth = LedAuth
Device.prototype.LedBusy = LedBusy
Device.prototype.LedIdle = LedIdle

module.exports = Device
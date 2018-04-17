const EventEmitter = require('events').EventEmitter
const fs = require('fs')
const path = require('path')

const debug = require('debug')('bootstrap:device')

const POWER_EVENT = path.join(__dirname, '../../tmptest/power')

const LED_EVENT = '../../tmptest/led'

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

  /*
  listenEnterAuth(callback) {
    let timer = setTimeout(() => {
      callback(null, false)
      callback = undefined
      if( Array.isArray(this.enterHandler)) {
        let index = this.enterHandler.findIndex( x => x === obj)
        if(index !== -1) this.enterHandler = [...this.enterHandler.slice(0, index), ...this.enterHandler.slice(index + 1)]
      }
    }, 10 * 1000)

    let obj = { callback, timer }

    if (this.enterHandler && Array.isArray(this.enterHandler)) this.enterHandler.push(obj)
    else this.enterHandler = [obj]
  }

  listenExitAuth(callback) {
    
  }
  */

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


class LedIdle extends LedBase {

  enter () {
    super.enter()
    this.writeState(this.constructor.name)
  }

}

class LedAuth extends LedBase {

  enter (outState) {
    super.enter()

    // notify observer
    let enterListeners = this.ctx.enterAuthListeners 
    if(Array.isArray(enterListeners))
      enterListeners.forEach(x => {
        clearTimeout(x[0])
        x[1](null, true)
      })
    //clear enter listeners
    this.ctx.enterAuthListeners = null
    
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
    if(Array.isArray(exitAuthListeners))
      exitAuthListeners.forEach(x => {
        clearTimeout(x[0])
        x[1](null, true)
      })
    super.exit()
  }
}

class LedBusy extends LedBase {

  enter () {
    super.enter()
    this.writeState(this.constructor.name)
  }
}


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
          this.enterAuthListeners = this.enterAuthListeners.splice(index)
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
          this.exitAuthListeners = this.exitAuthListeners.splice(index)
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
      callback(err, isAuth)
    })
  }

  pollingPowerButton(timeout, callback) {

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
  }

  updateLed(state) {
    this.ledState.changeLedState(state)
  }

}

Device.prototype.LedAuth = LedAuth
Device.prototype.LedBusy = LedBusy
Device.prototype.LedIdle = LedIdle

module.exports = Device
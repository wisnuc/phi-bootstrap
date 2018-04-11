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
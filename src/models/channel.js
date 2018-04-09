const tls = require('tls')
const EventEmitter = require('events').EventEmitter

const State = require('./state')
const debug = require('debug')('bootstrap:connect')

const CONNECT_STATE = {
  DISCONNECTED : "DISCONNECTED",
  CONNECTED: "CONNECTED",
  CONNECTING: "CONNECTING"
}


class Disconnect extends State {

  enter(err) {
    super.enter()
    this.ctx.last = {
      time: new Date().getTime(),
      error: err || null,
    }
    this.startTime = new Date().getTime()

    this.timeout = 5000
    
    this.timer = setTimeout(() => this.setState('Connecting'), this.timeout)
  }

  exit() {
    clearTimeout(this.timer)
    super.exit()
  }

  connect() {
    this.setState('Connecting')
  }

  disconnect() {
    
  }

}


class Connecting extends State {

  enter() {
    super.enter()
    this.socket = tls.connect(this.ctx.port, this.ctx.addr, options, () => {
      console.log('client connected', socket.authorized ? 'authorized' : 'unauthorized')
      this.setState('Connected', this.socket)
    })
    this.socket.setEncoding('utf8')
    this.socket.on('error', err => this.setState('Disconnect', err))
    this.socket.on('end', () => this.setState('Disconnect', new Error('server end')))
  }

  exit() {
    this.socket.removeAllListener()
    this.socket.on('error', () => {})
    this.socket = undefined
    super.exit()
  }

  connect() {

  }

  disconnect() {

  }
}

class Connected extends State {

  enter(socket) {
    super.enter()
    this.socket.removeAllListener()  // remove first
    this.socket.on('data', data => {
      console.log(data)
    })

    this.socket.once('error', err => this.setState("Disconnect", err))

    this.socket.once('end', () => this.setState('Disconnect', new Error('server end')))
  }

  exit() {
    this.socket.removeAllListener()
    this.socket.on('error', () => {})
    super.exit()
  }

  sendToCloud() {

  }

}



/**
 * @class Channel
 * To connect phi cloud
 * listen pipe message
 * check self handles if can handler
 * send to appifi if it alive
 */
class Channel extends EventEmitter {

  constructor (ctx, opts) {
    super()
    this.ctx = ctx
    this.opts = opts
    this.handles = new Map()
    this.port = 8000
    this.addr = 'localhost'
    new Connecting(this)    
  }

  handleCloudMessage(message) {
    if (this.handles.has(message.type)) 
      return this.handles.get(message.key)(message)
    if (!isAppifiAvaliable) {} // return error

    //send to Appifi
  }

  isAppifiAvaliable() {
    return this.ctx.appifi.getState() === 'Started'
  }

  getState() {
    return this.state.constructor.name
  }

  reconnect() {

  }

  disconnect() {
    
  }

  destory () {
     
  }
}

Channel.prototype.Connected = Connected
Channel.prototype.Connecting = Connecting
Channel.prototype.Disconnect = Disconnect

module.exports = Channel
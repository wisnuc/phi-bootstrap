const tls = require('tls')
const EventEmitter = require('events').EventEmitter
const UUID = require('uuid')

const debug = require('debug')('bootstrap:Channel')

const CONNECT_STATE = {
  DISCONNECTED : "DISCONNECTED",
  CONNECTED: "CONNECTED",
  CONNECTING: "CONNECTING"
}

class State {

  constructor(ctx, ...args) {
    this.ctx = ctx
    ctx.state = this
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

  connect() {
    this.setState('Connecting')
  }

  disconnect() {
    
  }

  sendToCloud(obj) {
    debug(`can not send message of ${ this.constructor.name } -->`, obj)
  }

  view () {
    return null
  }

  destroy () {
    this.exit()
  }
}

class Disconnect extends State {

  enter(err) {
    super.enter()

    debug(err)

    this.ctx.last = {
      time: new Date().getTime(),
      error: err || null,
    }
    this.startTime = new Date().getTime()

    this.timeout = 30 * 1000
    
    this.timer = setTimeout(() => this.setState('Connecting'), this.timeout)
  }

  exit() {
    clearTimeout(this.timer)
    super.exit()
  }

}


class Connecting extends State {

  enter() {
    super.enter()
    this.socket = tls.connect(this.ctx.port, this.ctx.addr, this.ctx.opts, () => {
      console.log('*****client connected*****', this.socket.authorized ? 'authorized' : 'unauthorized')
      this.setState('Connected', this.socket)
    })
    this.socket.setEncoding('utf8')
    this.socket.on('error', err => this.setState('Disconnect', err))
    this.socket.on('end', () => this.setState('Disconnect', new Error('server end')))
  }

  exit() {
    this.socket.removeAllListeners()
    this.socket.on('error', () => {})
    this.socket = undefined
    super.exit()
  }

  destroy () {
    this.exit()
    this.socket.end()
  }
}

class Connected extends State {

  enter(socket) {
    super.enter()
    this.messageBuf = Buffer.from('')
    this.socket = socket
    this.socket.removeAllListeners()  // remove first
    this.socket.on('data', data => {
      // console.log('Cloud Message ===> ', data)
      let message 
      try {
        message = JSON.parse(data)
      } catch (error) {
        return
      }
      this.ctx.handleCloudMessage(message)
    })

    this.socket.once('error', err => this.setState("Disconnect", err))

    this.socket.once('end', () => this.setState('Disconnect', new Error('server end')))
  }

  exit() {
    this.socket.removeAllListeners()
    this.socket.on('error', () => {})
    this.socket.end()
    super.exit()
  }

  sendToCloud(obj) {
    debug(obj)
    let a = JSON.stringify(obj) + '\n'
    this.socket.write(a)
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

  constructor (ctx, addr, port, opts, handles) {
    super()
    this.ctx = ctx
    this.opts = opts
    this.handles = handles instanceof Map ? handles : new Map()
    this.port = port
    this.addr = addr
    this.msgQueue = new Map()
    new Connecting(this)    
  }

  handleCloudMessage(message) {
    debug('FROM_CLOUD:', message)
    if (message.type === 'req' && this.handles.has(message.reqCmd)) 
      return this.handles.get(message.reqCmd)(message)
    if (message.type === 'pip') {
      // if (!this.isAppifiAvaliable) {} // return error
      if (!this.isAppifiAvaliable()) {
        return this.ctx.appifi.sendMessage(message)
      }
      return console.log('appifi not avaliable', message)
    }
    if (message.type === 'ack') {
      if (this.msgQueue.has(message.msgId)) {
        let handle = this.msgQueue.get(message.msgId)
        this.msgQueue.delete(message.msgId) // remove handle
        return handle(message)
      }
      else return console.log('unhandle ack message: ',message)
    }
    console.log('****Miss Channdle Message****', message)
  }

  isAppifiAvaliable() {
    return this.ctx.appifi.getState() === 'Started'
  }

  getState() {
    return this.state.constructor.name
  }

  send(obj, callback) {
    if (obj.type === 'req' && callback) this.msgQueue.set(obj.msgId, callback)
    this.state.sendToCloud(obj)
  }

  reconnect() {

  }

  createReqMessage (reqCmd, data) {
    return {
      type: 'req',
      msgId: UUID.v4(),
      reqCmd,
      data
    }
  }

  createAckMessage (msgId, data) {
    return {
      type: 'ack',
      msgId,
      data
    }
  }

  disconnect() {
    
  }

  destroy () {
     this.state.destroy()
  }
}

Channel.prototype.Connected = Connected
Channel.prototype.Connecting = Connecting
Channel.prototype.Disconnect = Disconnect

module.exports = Channel
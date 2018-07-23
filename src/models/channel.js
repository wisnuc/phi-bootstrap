const tls = require('tls')
const EventEmitter = require('events').EventEmitter
const UUID = require('uuid')
const jwt = require('jwt-simple')
const request = require('request')
const child = require('child_process')

const getDeviceInfo = require('../lib/device')
let deviceInfo = getDeviceInfo()

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

/** start connect to cloud */
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
    this.socket.on('close', () => this.setState('Disconnect', new Error('server closed')))
    this.socket.setKeepAlive(true, 100)
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
    child.exec('echo 60 > /proc/sys/net/ipv4/tcp_keepalive_time', err => debug('echo tcp_keepalive_time err: ', err))
    child.exec('echo 5 > /proc/sys/net/ipv4/tcp_keepalive_intvl', err => debug('echo tcp_keepalive_intvl err: ', err))
    child.exec('echo 3 > /proc/sys/net/ipv4/tcp_keepalive_probes', err => debug('echo tcp_keepalive_probes err: ', err))
    this.msgSep = Buffer.from('\n')
    this.msgBuf = null

    this.socket = socket
    this.socket.removeAllListeners()  // remove first
    this.socket.on('data', this.handleDataEvent.bind(this))

    this.socket.once('error', err => this.setState("Disconnect", err))

    this.socket.once('end', () => this.setState('Disconnect', new Error('server end')))
  }

  handleDataEvent (data) {
    let bufArr = this.spliceBuffer(Buffer.from(data))

    let notify = (buf) => {
      let message 
      try {
        message = JSON.parse(buf)
      } catch (error) {
        return
      }
      this.ctx.handleCloudMessage(message)
    }

    //msgSep not found
    if (bufArr.length === 1) {
      if (bufArr[0].length)
        this.msgBuf = this.msgBuf ? Buffer.concat([this.msgBuf, buf]) : bufArr[0]
      else if (this.msgBuf) {
        notify(this.msgBuf.toString())
        this.msgBuf = null
      }      
      return 
    }

    // bufArr length > 1
    for (let i = 0; i < bufArr.length; i++) {
      if (i === 0) {
        let msg = this.msgBuf ? Buffer.concat([this.msgBuf, bufArr[i]]).toString() : bufArr[i].toString()
        this.msgBuf = null
        notify(msg)
        continue
      }

      // do check endpoint.
      // if empty string, mean last-1 is complete message
      // else buffer last-1 item
      if (i === bufArr.length -1) {
        if (bufArr[i].length) {
          this.msgBuf = bufArr[i]
        } else {
          this.msgBuf = null
        }
        return 
      }

      notify(bufArr[i].toString())
    }
  }

  /**
   * use msgSep to split buffer
   * @param {Buffer} buf 
   * test buffer: xxxxxxxxxMSGSEPxxxxxxxxxMSGSEP
   * return [xxxxxxxxx, xxxxxxxxx]
   */
  spliceBuffer(buf) {
    let bufArr = []
    let index = buf.indexOf(this.msgSep)
    
    if (index === -1) return [buf]
  
    let newBuf = buf.slice(0, index)
    bufArr.push(newBuf)

    let next = buf.slice(index + 1)
    if (!next.length) {
      bufArr.push(next)
      return bufArr
    }
  
    return [...bufArr, ...this.spliceBuffer(next)]
  }

  exit() {
    this.socket.removeAllListeners()
    this.socket.on('error', () => {})
    this.socket.end()
    super.exit()
  }

  sendToCloud(obj) {
    debug('******Send To Cloud****** \n', obj)
    let a = JSON.stringify(obj) + '\n'
    this.socket.write(a)
  }

}

const COMMAND_URL = `/ResourceManager/nas/callback/command`

/**
 * @class Channel
 * To connect phi cloud
 * listen pipe message
 * check self handles if can handler
 * send to appifi if it alive
 */
class Channel extends EventEmitter {

  constructor (ctx, addr, port, opts, reqHandles, noticeHandles, pipHandles) {
    super()
    this.ctx = ctx
    this.opts = opts
    this.port = port
    this.addr = addr

    this.reqHandles = reqHandles instanceof Map ? reqHandles : new Map()
    this.noticeHandles = noticeHandles instanceof Map ? noticeHandles : new Map()
    this.pipHandles = pipHandles instanceof Map ? pipHandles : new Map()
    this.msgQueue = new Map()
    new Connecting(this)    
  }

  handleCloudMessage(message) {
    debug('****FROM_CLOUD**** \n', message)
    switch (message.type) {
      case 'req':
        if (this.reqHandles.has(message.reqCmd))
          this.reqHandles.get(message.reqCmd)(message)
        break
      case 'pip':
        if (!this.ctx.boundUser) return 
        let paths = message.data.urlPath.split('/').filter(x => !!x)
        let phicommUserId = message.packageParams.uid
        // return jwt if is boundUser
        if (paths.length && paths[0] === 'token' && phicommUserId === this.ctx.boundUser.phicommUserId)
          return this.sendToken(message, phicommUserId)
        if (paths.length && paths[0] === 'platinum' && phicommUserId === this.ctx.boundUser.phicommUserId) {
          let verb = message.data.verb && message.data.verb.toUpperCase()
          if (verb === 'GET') {
            return this.responseToCloud(undefined, { status: this.ctx.platinum.state() }, message)
          }
          if (verb === 'POST') {
            return this.ctx.platinum.setOnOff(!!message.data.body.status, err => {
              if (err) return this.responseToCloud({
                msg: err.message,
                status: error.status || 400
              }, undefined, message)
              return this.responseToCloud(undefined, {}, message)
            })
          }
        }
        if (this.isAppifiAvaliable()) {
          return this.ctx.appifi.sendMessage(message)
        } else {
          debug('appifi not availibale ', message)
          //TODO: bootstrap response pipe message, return error { message: 'fruixmix not started'}
        }
        break
      case 'ack':
        if (this.msgQueue.has(message.msgId)) {
          let handle = this.msgQueue.get(message.msgId)
          this.msgQueue.delete(message.msgId) // remove handle
          return handle(message)
        }
        break
      case 'notice':
        if (this.noticeHandles.has(message.noticeType))
          this.noticeHandles.get(message.noticeType)(message)
        break
      default:
        break
    }
  }

  isAppifiAvaliable() {
    return this.ctx.appifi.getState() === 'Started'
  }

  /**
   * response pipe-token api, if request user is boundUser
   */
  sendToken (message, phicommUserId) {
    let data = {
      type: 'JWT',
      forRemote: true,
      token: jwt.encode({
        phicommUserId,
        place: 'bootstrap',
        timestamp: new Date().getTime()
      }, this.ctx.conf.secret)
    }
    this.responseToCloud(undefined, data, message)
  }

  responseToCloud(error, data, message) {
    let urlTest = `http://sohon2test.phicomm.com/ResourceManager/nas/callback/${ message.packageParams.waitingServer }/command`
    let urlDev = `http://sohon2dev.phicomm.com/ResourceManager/nas/callback/${ message.packageParams.waitingServer }/command`
    let url = this.ctx.conf.useDevCloud ? urlDev : urlTest
    return request({
      uri: url,
      method: 'POST',
      headers: { Authorization: this.ctx.cloudToken },
      body: true,
      json: {
        common: {
          deviceSN: deviceInfo.deviceSN,
          msgId: message.msgId,
          flag: false
        },
        data: {
          res: data,
          err: error
        }
      }
    }, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        debug(`reqCommand body: ${body}`)
      } else {
        debug('send token failed', body)
      }
    })
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
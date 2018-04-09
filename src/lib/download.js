const fs = require('fs')
const EventEmitter = require('events')
const request = require('superagent') 

const State = require('../models/state')

/**
returns {
  length: may be undefined, 'unknown', or an integer,
  bytesWritten: ws.bytesWritten, an integer
  destroy: function to destory download
}
*/

/**
const download = (url, tmpfile, callback) => {
  let rs, ws, len
  let finished = false
  let destroyed = false 

  const destroy = () => {
    if (destroyed || finished) return
    destroyed = true
    rs.removeAllListeners('error')
    rs.removeAllListeners('response')
    rs.on('error', () => {})
    ws.removeAllListeners()
    ws.on('error', () => {})
    //  rs.unpipe()
    rs.abort()
    ws.destroy()
  }

  rs = request.get(url)
  rs.on('error', err => (destroy(), callback(err)))
  rs.on('response', res => {
    if (res.header['content-length']) {
      len = parseInt(res.header['content-length'])
    } else {
      len = 'unknown'
    }
  })

  ws = fs.createWriteStream(tmpfile)
  ws.on('error', err => (destroy(), callback(err)))
  ws.on('finish', () => {
    finished = true 
    if (len && len !== 'unknown') {
      if (len === ws.bytesWritten) {
        callback(null)
      } else {
        let err = new Error('size mismatch')
        err.code = 'ESIZEMISMATCH'
        callback(err)
      }
    } else {
      callback(null)
    }
  })

  rs.pipe(ws)

  let obj = { destroy }
  Object.defineProperty(obj, 'length', { get: () => len })
  Object.defineProperty(obj, 'bytesWritten', { get: () => ws.bytesWritten })
  return obj
}
*/

// Download has only one state, if error while working, emit error
class Working extends State {
  enter() {
    this.rs = request.get(this.ctx.url)
    this.rs.on('error', err => {
      this.destroy()
      this.ctx.emit('error', err)
    })
    this.rs.on('response', res => {
      if (res.header['content-length']) {
        this.ctx.length = parseInt(res.header['content-length'])
      } else {
        this.ctx.length = 'unknown'
      }
    })

    this.ws = fs.createWriteStream(this.ctx.tmpfile)
    this.ws.on('error', err => {
      this.destroy()
      this.ctx.emit('error', err)
    })
    this.ws.on('finish', () => {
      if (this.ctx.length && this.ctx.length !== 'unknown') {
        if (this.ctx.length === this.ws.bytesWritten) this.ctx.emit('finished')
        else {
          this.destroy()
          let e = new Error('size mismatch')
          e.code = 'ESIZEMISMATCH'
          this.ctx.emit('error', err)
        }
      } else this.ctx.emit('finished')
    })

    this.rs.pipe(this.ws)
  }

  bytesWritten() {
    return this.ws.bytesWritten
  }

  destroy() {
    this.rs.removeAllListeners('error')
    this.rs.removeAllListeners('response')
    this.rs.on('error', () => {})
    this.ws.removeAllListeners()
    this.ws.on('error', () => {})
    this.rs.abort()
    this.ws.destroy()

    super.destroy()
  }
}

class Download extends EventEmitter {
  constructor(url, tmpfile) {
    super()
    this.url = url
    this.tmpfile = tmpfile

    new Working(this)
  }

  bytesWritten() {
    return this.state.bytesWritten()
  }

  destroy() {
    this.state.destroy()
  }
}

Download.prototype.Working = Working

module.exports = Download

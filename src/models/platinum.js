const EventEmitter = require('events')
const path = require('path')
const fs = require('fs')
const DataStore = require('../lib/DataStore')
const E = require('../lib/error')
const child = require('child_process')

const PlatinumState = {
  UNSET: 'unset',
  ON: 'on',
  OFF: 'off'
}

class Platinum {

  constructor(ctx, src, tmp) {
    this.ctx = ctx

    this.store = new DataStore({
      file: src,
      tmpDir: tmp,
      isArray: false
    })

    this.store.on('Update', this.handleUpdate.bind(this))

    Object.defineProperty(this, 'setting', {
      get () {
        return this.store.data || null
      }
    })
  }

  handleUpdate() {
    let isOn = this.setting ? this.setting.isOn : true
    child.exec(`systemctl ${ isOn ? 'start' : 'stop' } peerstar`)
  }

  checkAndRestart() {
    if ((this.setting && this.setting.isOn) || !this.setting) {
      return child.exec(`systemctl start peerstar`)
    }
    return child.exec(`systemctl stop peerstar`)
  }

  isOn () {
    return this.setting ? this.setting.isOn ? 'on' : 'off' : 'unset' 
  }

  setOnOff (isOn, callback) {
    let data = { isOn: !!isOn }
    this.store.save(data, callback)
  }
}

module.exports = Platinum
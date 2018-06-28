const EventEmitter = require('events')
const path = require('path')
const fs = require('fs')
const DataStore = require('../lib/DataStore')
const E = require('../lib/error')

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

  }

  isOn () {
    return !this.setting
  }

  setOnOff (isOn, callback) {
    let data = isOn ? null : {}
    this.store.save(data, callback)
  }
}

module.exports = Platinum
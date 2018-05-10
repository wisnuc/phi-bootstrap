const EventEmitter = require('events')
const path = require('path')
const fs = require('fs')
const bcrypt = require('bcryptjs')
const UUID = require('uuid')
const deepFreeze = require('deep-freeze')

const DataStore = require('../lib/DataStore')
const E = require('../lib/error')

const userEntryMProps = [
  'uid',
  'password',
  'username'
]

const validateUser = (user) => {

}

/**
 * Accound struct
 * {
 *    phicommUid: 'xxx'  // string
 * }
 */
class Account extends EventEmitter {

  constructor (ctx, src, tmp) {
    
    super()
    this.ctx = ctx
    this.store = new DataStore({
      file: src,
      tmpDir: tmp,
      isArray: false
    })

    this.store.on('Update', (...args) => this.emit('Update', ...args))

    Object.defineProperty(this, 'user', {
      get () {
        return this.store.data
      }
    })
  }

  /**
   * 
   * @param {object} props 
   * @param {function} callback
   * @param {string} props.phicommUserId // required 
   */
  updateUser (props, callback) {
    this.store.save(user => {
      // unbind
      if(!user && !props) return user
      if(!props.phicommUserId || props.phicommUserId === '0') return null
      // TODO: jump to unbind && clean
      let currUser = user ? Object.assign({}, user) : null
      let nextUser = currUser && props.phicommUserId == currUser.phicommUserId ? Object.assign({}, this.user, props) : props
      return nextUser
    }, (err, data) => err ? callback(err) : callback(null, Object.assign({}, data, { password: undefined })))
  }

  updateUserPassword (password, callback) {
    // FIXME: auth?
    return this.updateUser({ password }, callback)
  }

}

module.exports = Account

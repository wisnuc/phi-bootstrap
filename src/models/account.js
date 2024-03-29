const EventEmitter = require('events')
const path = require('path')
const fs = require('fs')
const bcrypt = require('bcryptjs')
const UUID = require('uuid')

const DataStore = require('../lib/DataStore')
const E = require('../lib/error')

const userEntryMProps = [
  'uid',
  'password',
  'username'
]

const validateUser = (user) => {

}

const isNonEmptyString = arg => typeof arg === 'string' && arg.length > 0

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
      let currUser = user ? Object.assign({}, user) : null
      let nextUser = currUser && props.phicommUserId == currUser.phicommUserId ? Object.assign({}, currUser, props) : props
      return nextUser
    }, (err, data) => err ? callback(err) : callback(null, data ? Object.assign({}, data, { password: undefined }) : null))
  }

  updateUserPassword (props, callback) {
    if (!isNonEmptyString(props.password)) return callback(new Error('password type error'))
    this.store.save(user => {
      if (!user) throw new Error('no boundUser')
      let nextUser = Object.assign({}, user)
      if (props.password) nextUser.password = props.encrypted ? props.password : bcrypt.hashSync(props.password, bcrypt.genSaltSync(10))
      return nextUser
    }, callback)
  }

}

module.exports = Account

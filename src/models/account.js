const EventEmitter = require('events')
const path = require('path')
const fs = require('fs')
const bcrypt = require('bcrypt')
const UUID = require('uuid')
const deepFreeze = require('deep-freeze')

const E = require('../lib/error')
const { saveObjectAsync, passwordEncrypt, unixPasswordEncrypt, md4Encrypt } = require('../lib/utils')

const userEntryMProps = [
  'uid',
  'password',
  'username'
]

const validateUser = (user) => {

}

class Account extends EventEmitter {

  constructor (ctx, src, tmp) {
    
    super()

    this.ctx = ctx

    this.filePath = src
    this.tmpDir = tmp

    try {
      this.user = JSON.parse(fs.readFileSync(this.filePath))
    } catch (e) {
      if (e.code !== 'ENOENT') throw e
      this.user = undefined
    }

    validateUser(this.user)
    if(this.user) deepFreeze(this.user)

    /**
    @member {boolean} lock - internal file operation lock
    */
    this.lock = false
  }

  async commitUserAsync(currUser, nextUser) {

    // referential equality check
    if (currUser !== this.user) throw E.ECOMMITFAIL()

    // check atomic operation lock
    if (this.lock === true) throw E.ECOMMITFAIL()
    
    //validate
    validateUser(nextUser)

    // get lock
    this.lock = true
    try {

      // save to file
      await saveObjectAsync(this.filePath, this.tmpDir, nextUser)

      // update in-memory object
      this.user = nextUser

      // enforce immutability
      deepFreeze(this.user)
    } finally {
      // put lock
      this.lock = false
    }
  }

  async updateUserAsync (props) {
    // unbind
    if(!this.user && !props) return 
    // TODO: jump to unbind && clean

    let currUser = this.user

    let nextUser = currUser && props.uid == currUser.uid ? Object.assign({}, this.user, props) : props

    await this.commitUserAsync(currUser, nextUser)

    return Object.assign({}, nextUser, { password: undefined })

  }

  async updateUserPasswordAsync (password) {
    // FIXME: auth?
    return await this.updateUserAsync ({ password })
  }

}

module.exports = Account
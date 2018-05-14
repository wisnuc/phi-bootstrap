const Promise = require('bluebird')
const path = require('path')
const fs = Promise.promisifyAll(require('fs'))
const EventEmitter = require('events')

const bcrypt = require('bcryptjs')
const mkdirp = require('mkdirp')
const mkdirpAsync = Promise.promisify(mkdirp)
const rimraf = require('rimraf')
const rimrafAsync = Promise.promisify(rimraf)
const UUID = require('uuid')
const debug = require('debug')('bootstrap:model')

const { untar } = require('../lib/tarball')
const { probeAppBalls } = require('../lib/appball')

const untarAsync = Promise.promisify(untar)
const probeAppBallsAsync = Promise.promisify(probeAppBalls)

const Appifi = require('./appifi')
const Fetch = require('./fetch')
const Release = require('./release')
const Node = require('./node')
const Deb = require('./deb')
const Device = require('./device')
const Channel = require('./channel') 
const Account = require('./account')

const Config = require('../lib/config')
const Cmd = Config.cmd
const ServerConf =  Config.server

const deviceInfo = require('../lib/device')()

const ERace = Object.assign(new Error('another operation is in progress'), { code: 'ERACE', status: 403 })
const EApp404 = Object.assign(new Error('app not installed'), { code: 'ENOTFOUND', status: 404 })

// const githubUrl = 'https://api.github.com/repos/wisnuc/appifi-release/releases'

class Model extends EventEmitter {

  /**
  Create the model
  @param {string} root - deployment root directory, such as '/phi'
  @param {string} githubUrl - the gihub release api url 
  @param {string} appBalls - local tarballs, with local (manifest), path, and config (package.json) in future.
  @param {boolean} betaOn - whether use beta, true for betaOn
  @param {string} tagName - currently deployed version, such as '0.9.14'
  @param {boolean} globalNode - use globally installed node, rather than local one
  */
  constructor(root, githubUrl, appBalls, betaOn, tagName, globalNode) {
    super()

    this.betaOn = betaOn
    this.globalNode = !!globalNode

    this.root = root
    this.githubUrl = githubUrl
    this.tmpDir = path.join(this.root, 'tmp')
    this.appBallsDir = path.join(this.root, 'appifi-tarballs')
    this.appifiDir = path.join(this.root, 'appifi')

    rimraf.sync(this.tmpDir)
    mkdirp.sync(this.tmpDir)
    mkdirp.sync(this.appifiDir)
    mkdirp.sync(this.appBallsDir)

    // releases
    this.releases = appBalls.map(ball => new Release(this, ball))

    // start fetch  
    this.fetch = new Fetch(this.githubUrl)
    this.fetch.on('update', data => {
      this.updateRemotes(data)
      this.reqSchedule()      
    })

    let names = ['libimage-exiftool-perl', 'imagemagick', 'ffmpeg']
    this.deb = new Deb(names)
    
    this.device = new Device(this)

    this.account = new Account(this, path.join(root, 'user.json'), path.join(root, 'tmp'))

    this.appifi = null

    process.on('uncaughtException', err => {
      console.log('uncaughtException', err)
      if (this.appifi) this.appifi.destroy()
      process.exit()
    })

    Object.defineProperty(this, 'appifi', {
      get: function () {
        return this._appifi
      },
      set: function(x) {
        if(this._appifi) this._appifi.removeAllListeners()
        this._appifi = x
        this._appifi.on('Started', this.handleAppifiStarted.bind(this))
        this._appifi.on('message', this.handleAppifiMessage.bind(this))
      }
    })

    if (tagName) this.appifi = new Appifi(this, tagName)

    let channelHandles = new Map()

    channelHandles.set(Cmd.FROM_CLOUD_TOUCH_CMD, this.handleCloudTouchReq.bind(this))
    channelHandles.set(Cmd.CLOUD_CHANGE_PASSWARD_MESSAGE, this.handleCloudChangePwdMessage.bind(this))
    channelHandles.set(Cmd.FROM_CLOUD_BIND_CMD, this.handleCloudBindReq.bind(this))

    let options = deviceInfo.deviceSecret
    
    let noticeHandles = new Map()
    noticeHandles.set(Cmd.FROM_CLOUD_UNBIND_NOTICE, this.handleCloudUnbindNotice.bind(this))

    this.channel = new Channel(this, ServerConf.addr, ServerConf.port, options, channelHandles, noticeHandles)

    this.channel.on('Connected', this.handleChannelConnected.bind(this))
    
    this.cloudToken = undefined
  }

  handleAppifiStarted () {
    if (this.account.user) this.sendBoundUserToAppifi(this.account.user)
    if (this.cloudToken) this.appifi.sendMessage({ 
      type: Cmd.TO_APPIFI_TOKEN_CMD,
      data: {
        token: this.cloudToken 
      } 
    })
    this.appifi.sendMessage({ 
      type:Cmd.TO_APPIFI_DEVICE_CMD,
      data: Object.assign({}, deviceInfo, { deviceSecret: undefined})
    })
  }

  sendBoundUserToAppifi(user) {
    // let user = u ? u : this.account.user ? this.account.user : null
    debug('sendBoundUserToAppifi: ', user)
    if (this.appifi) this.appifi.sendMessage({ type:Cmd.TO_APPIFI_BOUND_USER_CMD, data:user.phicommUserId ? user : null })
  }

  handleCloudTouchReq (message) {
    debug('handleCloudTouchReq')
    let msgId = message.msgId
    this.device.requestAuth(30 * 1000, (err, isAuth) => {
      debug('TouchEnd', err, isAuth)
      let status = isAuth ? 'ok' : 'timeout' 
      if(err) debug('Touch Error: ', err)
      return this.channel.send(this.channel.createAckMessage(msgId, { status }))
    })
  }

  /**
   * 1. req 发送设备接入请求 to Cloud
   * 2. 1返回结果　包括　boundUser
   * 3. 发送boundUser to Appifi 
   * 4. req 发送Token请求 To Cloud
   * 5. 4返回Token
   * 6. 发送Token To Appifi
   */
  handleChannelConnected () {
    // create connect message
    let connectBody = this.channel.createReqMessage(Cmd.TO_CLOUD_CONNECT_CMD, {
      deviceModel: deviceInfo.deviceModel,
      deviceSN: deviceInfo.deviceSN,
      MAC: deviceInfo.net.mac,
      localIp: deviceInfo.net.address,
      swVer: deviceInfo.softwareVersion,
      hwVer: deviceInfo.hardwareVersion
    })
    this.channel.send(connectBody, message => {
      // message inclouds boundUserInfo
      this.handleCloudBoundUserMessage(message)
      this.channel.send(this.channel.createReqMessage(Cmd.TO_CLOUD_GET_TOKEN_CMD, {}), message => {
        // message inclouds Token
        this.cloudToken = message.data.token
        if (this.appifi) this.appifi.sendMessage({ type: Cmd.TO_APPIFI_TOKEN_CMD, data: message.data })
      })
    })
  }

  /**
   * 
   * @param {obj} message
   * {
   *    type: 'ack'
   *    msgId: 'xxx'
   *    data: {
   *       uid: "" //　设备绑定用户phicomm bindedUid, 未绑定时值为０
   *    }
   * } 
   */
  handleCloudBoundUserMessage (message) {
    let data = message.data
    if (!data) return
    if (!data.hasOwnProperty('bindedUid')) return
    let props = {
      phicommUserId: data.bindedUid
    }
    this.account.updateUser(props, (err, d) => {
      // notify appifi
      if (err) debug('update user error: ', err)
      if (data.bindedUid === '0') props.phicommUserId = null
      this.sendBoundUserToAppifi(props)
    })
  }

  handleCloudChangePwdMessage(message) {
    
  }

  /**
   * handle appifi message
   * @param {*} message 
   */
  handleAppifiMessage(message) {
    debug('***FROM_APPIFI_MESSAGE:', message)
    let obj
    try {
      obj = JSON.parse(message)
    } catch (e) { return debug(e)}
    if (obj.type === Cmd.FROM_APPIFI_USERS_CMD) {
      if (Array.isArray(obj.users))
        return this.channel.send(this.channel.createReqMessage(Cmd.TO_CLOUD_SERVICE_USER_CMD, {
          userList: obj.users,
          deviceSN: deviceInfo.deviceSN
        }))
      else return debug('invaild users', obj)
    }
  }

  /**
   * handle cloud user unbind message 
   * @param {object} message
   * @param {object} message.data
   * @param {string} message.data.uid
   * @param {string} message.data.deviceSN 
   */
  handleCloudUnbindNotice (message) {
    if (!message.data || !message.data.uid || !message.deviceSN) return debug("Error Unbind Message", message)
    if (message.data.uid !== this.account.user.phicommUserId) return debug('Error Unbind: uid mismatch')
    if (message.data.deviceSN !== deviceInfo.deviceSN) return debug('Error Unbind: deviceSn mismatch')
    let props = { phicommUserId: '0' }
    this.account.updateUser(props, (err, data) => {
      if (err) debug('*****unbind error*****', err)
      // just do it
      this.appStop(() => {
        this.appStart(() => {})
      })
    })
  }

  /**
   * 
   * @param {object} message 
   * {
   *    type: 'req'
   *    reqCmd: 'bind'
   *    msgId: 'xxx'
   *    data: {
   *      uid: 'xxxx'  //required
   *    }
   * }
   */
  handleCloudBindReq(message) {
    if (!message.data || typeof message.data !== 'object' || !message.data.hasOwnProperty('uid')) {
      return this.channel.send(this.channel.createAckMessage(message.msgId, { status: 'failure' }))
    }
    let props = { phicommUserId: message.data.uid }
    // set default password 
    props.password = bcrypt.hashSync('phicomm', bcrypt.genSaltSync(10))
    this.account.updateUser(props, (err, data) => {
      if (err) return this.channel.send(this.channel.createAckMessage(message.msgId, { status: 'failure' }))
      this.sendBoundUserToAppifi(props)
      return this.channel.send(this.channel.createAckMessage(message.msgId, { status: 'success' }))
    })
  }

  setBeta (val) {
    let value = !!val
    // betaOn changed
    if (this.betaOn !== value) {
      let config = {}
      try {
        let raw = fs.readFileSync(path.join(this.root, 'bootstrap.config.json'))
        config = JSON.parse(raw)
      } catch (e) {
        if (e.code !== 'ENOENT') {
          console.log('error loading bootstrap.config.json', e)
        }
      }

      config.betaOn = value
      fs.writeFileSync(path.join(this.root, 'bootstrap.config.json', JSON.stringify(config)))
      this.betaOn = value

      // betaOn: true -> false
      // 1. check current deployed release is prerelease or not, if it is, stop it.
      // 2. reqSchedule
      if (!value && this.appifi && this.appifi.isBeta()) {
        this.appifi.stopAsync()
        .then(() => { this.appifi = null })
      }

      // betaOn: false -> true
      // in this case, current deployed release is stable, there is no need to stop it.
      this.reqSchedule()
    }
  }

  nodePath () {
    return this.globalNode ? 'node' : '/phi/node/base/bin/node'
  }

  sort () {
    this.releases = this.releases.sort((a, b) => a.tagValue() - b.tagValue()).reverse()
  }

  updateRemotes (remotes) {
    // update remotes of existing release and create new releases
    remotes
      .reduce((nrs, remote) => {
        let rel = this.releases.find(r => r.tagName() === remote.tag_name)
        if (rel) {
          rel.setRemote(remote)
        } else {
          nrs.push(remote)
        }
        return nrs
      }, [])
      .forEach(remote => {
        let rel = new Release(this, { remote })
        this.releases.push(rel)
      })
  
    this.sort()
  }

  reqSchedule() {
    if (this.scheduled === true) return
    this.scheduled = true
    process.nextTick(() => this.schedule())
  }

  schedule () {
    if (this.operation) return

    this.scheduled = false

    // starting latest release download and stop all others
    // if betaOn, download the latest, no matter it is prerelease or not
    // if betaOff, download the latest stable
    if (this.betaOn) {
      this.releases.forEach((r, i) => i === 0 && r.getState() !== 'Stopped' ? r.start() : r.stop())
    } else {
      let index = this.releases.findIndex(r => {return r.isBeta() === false})
      this.releases.forEach((r, i) => i === index && r.getState() !== 'Stopped' ? r.start() : r.stop())
    }

    // if no appifi, start one (not necessarily latest)
    if (!this.appifi) {
      let latestReady = this.releases.find(r => r.getState() === 'Ready')
      if (latestReady) {
        this.appInstall(latestReady.tagName(), () => {})
      }
    }
  }

  destroy () {
    this.scheduled = true

    if (this.appifi) this.appifi.stop()
    this.releases.forEach(r => r.stop())

    this.channel.destroy()
  }

  /////////////////////////////////////////////////////////////////////////////

  async startAppifiAsync () {
    if (!this.appifi) throw new Error('appifi not found')
    this.appifi.startAsync()
  }

  async stopAppifiAsync () {
    if (!this.appifi) throw new Error('appifi not found')
    this.appifi.stopAsync()
  }

  async installAsync (tagName) {
    // find release
    console.log(`installAsync tagName ${tagName}`)
    let release = this.releases.find(r => r.local && r.local.tag_name === tagName)
    if (!release) {
      let err = new Error('release not found for given tag name')
      err.code = 'ENOTFOUND'
      err.status = 400
      throw err
    }

    if (release.getState() !== 'Ready') {
      let err = new Error('release is not ready for install')
      err.code = 'ENOTREADY'
      err.status = 400
      throw err
    }

    // untar into tmp dir
    let tmpDir = path.join(this.tmpDir, UUID.v4()) 
    await mkdirpAsync(tmpDir)
    try {
      await untarAsync(release.path, tmpDir)
    } catch (e) {
      rimraf(tmpDir, () => {})
      throw e
    }

    // stop appifi if existing
    if (this.appifi) {
      await this.appifi.stopAsync()
      this.appifi = null
    } 

    // move directory
    await rimrafAsync(this.appifiDir)
    await fs.renameAsync(tmpDir, this.appifiDir)

    // start appifi
    this.appifi = new Appifi(this, tagName)
  }

  //////////////////////////////////////////////////////////////////////////////

  view () {
    return {
      betaOn: this.betaOn,
      operation: this.operation,
      appifi: this.appifi ? this.appifi.view() : null,
      releases: this.releases.map(r => r.view()),
      fetch: this.fetch.view(),
//      node: this.node.view(),
//      deb: this.deb.view()
    }
  }

  appInstall (tagName, callback) {
    if (this.operation) return process.nextTick(() => callback(ERace))
    this.operation = 'appInstall'
    this.installAsync(tagName) 
      .then(() => (this.operation = null, callback(null)))
      .catch(e => (this.operation = null, callback(e)))
  }

  appStart (callback) {
    if (!this.appifi) return process.nextTick(() => callback(EApp404))
    if (this.operation) return process.nextTick(() => callback(ERace))
    this.operation = 'appStart'
    this.appifi.startAsync()
      .then(() => (this.operation = null, callback(null)))  
      .catch(e => (this.operation = null, callback(e)))
  }

  appStop (callback) {
    if (!this.appifi) return process.nextTick(() => callback(EApp404))
    if (this.operation) return process.nextTick(() => callback(ERace))
    this.operation = 'appStop'
    this.appifi.stopAsync()
      .then(() => (this.operation = null, callback(null)))  
      .catch(e => (this.operation = null, callback(e)))
  }

  releaseStart(tagName, callback) {

    console.log(`releaseStart, tagName ${tagName}`)

    let release = this.releases.find(r => r.tagName() === tagName)
    if (!release) {
      let err = new Error('release not found for given tag name')
      err.code = 'ENOTFOUND'
      err.status = 404
      return process.nextTick(() => callback(err))
    }
    release.start()
    callback(null)
  }

  releaseStop(tagName, callback) {
    let release = this.releases.find(r => r.tagName() === tagName)
    if (!release) {
      let err = new Error('release not found for given tag name')
      err.code = 'ENOTFOUND'
      err.status = 404
      return process.nextTick(() => callback(err))
    }
    release.stop()
    callback(null)
  }

  fetchStart(callback) {
    this.fetch.start()
    process.nextTick(() => callback(null))
  }
}

module.exports = Model




const child = require('child_process')
const fs = require('fs')
const path = require('path')

const cwd = process.cwd()
const tmptest = path.join(cwd, 'tmptest') 
const Model = require('../../src/models')

const powerPath = path.join('/phi/power')
const userPath = path.join(tmptest, 'user.json')

const rimraf = require('rimraf')
const mkdirp = require('mkdirp')
const expect = require('chai').expect

const githubUrl = 'https://api.github.com/repos/wisnuc/appifi-release/releases'

const accountInfo = {
  uid: "5253e843-a289-45e3-8fb8-a1b9bbdb45ef",
  password: '$2a$10$nUmDoy9SDdkPlj9yuYf2HulnbtvbF0Ei6rGF1G1UKUkJcldINaJVy', // password: 'alice'
  username: "JackYang"
}

process.on("uncaughtException", () => {
  if(fakeCloud) fakeCloud.kill()
    fakeCloud = undefined
  if(model) model.destroy()
    model = undefined
})

// let fakeCloud = child.fork('./test/lib/fakeCloud.js')
// fakeCloud.on('message', data => {
//   console.log('response ===>' , data)
//   let obj = JSON.parse(data)
//   if (obj.type === 'clientState'){
//     if(obj.state === 'true') {
//       fakeCloud.send('sendHardwareReq')
//       setTimeout( () => child.execSync(`echo 1 > ${ path.join(tmptest, 'power') }`), 5000)
//     } else {
//       console.log('client not found')
//     }
//   }
// })

// let model = new Model(tmptest, githubUrl, [], null, null , true)

// process.on('close', () => {
//   fakeCloud.kill()
// })

// setTimeout(() => {
//   fakeCloud.send('clientState')
// }, 5000)

let fakeCloud, model
describe(path.basename(__filename), () => {

  beforeEach(() => {
    rimraf.sync('/phi')
    mkdirp.sync('/phi')
    rimraf.sync(powerPath)
    rimraf.sync(path.join(tmptest, 'user.json'))
    fs.writeFileSync(powerPath)
  })

  it('should connect success', function(done) {
    this.timeout(0)
    fakeCloud = child.fork('./test/lib/fakeCloud.js')
    fakeCloud.on('message', data => {
      let obj = JSON.parse(data)
      if (obj.type === 'clientState'){
        expect(obj.state).to.deep.equal('true')
        done()
      }
      if (obj.type === 'ServerStarted') {
        model = new Model(tmptest, githubUrl, [], null, null , true)
        setTimeout(() => {
          fakeCloud.send('clientState')
        }, 1000)
      }
    })
  })

  it('should hardware auth false', function(done) {
    this.timeout(0)
    fakeCloud = child.fork('./test/lib/fakeCloud.js')
    fakeCloud.on('message', data => {
      let obj = JSON.parse(data)
      if (obj.type === 'clientState'){
        expect(obj.state).to.deep.equal('true')
        if(obj.state === 'true') {
          fakeCloud.send('sendHardwareReq')
          setTimeout(() => {
            expect(model.device.ledState.currentState()).to.equal('LedAuth')
          }, 1000)
        } else {
          console.log('client not found')
          done(new Error('client not found'))
        }
      }

      if (obj.type === "ack") {
        console.log(obj)
        expect(obj.data).to.deep.equal({
          status: 'timeout'
        })
        done()
      }

      if (obj.type === 'ServerStarted') {
        model = new Model(tmptest, githubUrl, [], null, null , true)
        setTimeout(() => {
          fakeCloud.send('clientState')
        }, 1000)
      }
    })
  })

  it('should hardware auth true', function(done) {
    this.timeout(0)
    fakeCloud = child.fork('./test/lib/fakeCloud.js')
    fakeCloud.on('message', data => {
      let obj = JSON.parse(data)
      if (obj.type === 'clientState'){
        expect(obj.state).to.deep.equal('true')
        if(obj.state === 'true') {
          fakeCloud.send('sendHardwareReq')
          setTimeout(() => {
            expect(model.device.ledState.currentState()).to.equal('LedAuth')
          }, 1000)
          setTimeout( () => child.execSync(`echo 1 > ${ powerPath }`), 1000)
        } else {
          console.log('client not found')
          done(new Error('client not found'))
        }
      }

      if (obj.type === "ack") {
        expect(obj.data).to.deep.equal({
          status: 'ok'
        })
        expect(model.device.ledState.currentState()).to.equal('LedIdle')
        done()
      }

      if (obj.type === 'ServerStarted') {
        model = new Model(tmptest, githubUrl, [], null, null , true)
        setTimeout(() => {
          fakeCloud.send('clientState')
        }, 1000)
      }
    })
  })

  it.only('should save account info', function(done) {
    this.timeout(0)
    fakeCloud = child.fork('./test/lib/fakeCloud.js')
    fakeCloud.on('message', data => {
      let obj = JSON.parse(data)
      if (obj.type === 'clientState'){
        expect(obj.state).to.deep.equal('true')
        if(obj.state === 'true') {
          fakeCloud.send('sendHardwareReq')
          setTimeout(() => {
            expect(model.device.ledState.currentState()).to.equal('LedAuth')
          }, 1000)
          setTimeout( () => child.execSync(`echo 1 > ${ powerPath }`), 1000)
        } else {
          console.log('client not found')
          done(new Error('client not found'))
        }
      }

      if (obj.type === "ack") {
        expect(obj).to.deep.equal({
          type: 'ack',
          data: {
            status: 'ok'
          }
        })
        expect(model.device.ledState.currentState()).to.equal('LedIdle')
        fakeCloud.send('sendAccountInfo')
        setTimeout(() => {
          expect(model.account.user).to.deep.equal(accountInfo)
          expect(JSON.parse(fs.readFileSync(userPath),toString())).to.deep.equal(accountInfo)
          done()
        }, 500)
        // done()
      }

      if (obj.type === 'ServerStarted') {
        model = new Model(tmptest, githubUrl, [], null, null , true)
        setTimeout(() => {
          fakeCloud.send('clientState')
        }, 1000)
      }
    })
  })

  it('should update account password success by cloud', function(done) {
    this.timeout(0)
    fakeCloud = child.fork('./test/lib/fakeCloud.js')
    fakeCloud.on('message', data => {
      let obj = JSON.parse(data)
      if (obj.type === 'clientState'){
        expect(obj.state).to.deep.equal('true')
        if(obj.state === 'true') {
          fakeCloud.send('sendHardwareReq')
          setTimeout(() => {
            expect(model.device.ledState.currentState()).to.equal('LedAuth')
          }, 1000)
          setTimeout( () => child.execSync(`echo 1 > ${ powerPath }`), 1000)
        } else {
          console.log('client not found')
          done(new Error('client not found'))
        }
      }

      if (obj.type === "CLOUD_HARDWARE_MESSAGE") {
        expect(obj.isAuth).to.equal(true)
        expect(model.device.ledState.currentState()).to.equal('LedIdle')
        fakeCloud.send('sendAccountInfo')
        setTimeout(() => {
          expect(model.account.user).to.deep.equal(accountInfo)
          expect(JSON.parse(fs.readFileSync(userPath),toString())).to.deep.equal(accountInfo)
          fakeCloud.send('sendAccountChangePwd')
          setTimeout(() => {
            expect(model.account.user.password).to.deep.equal('$2a$10$nUmDoy9SDdkPlj9yuYf2HulnbtvbF0Ei6rGF1G1UKUkJcldINaJVy')
            done()
          }, 500)
        }, 500)
        // done()
      }

      if (obj.type === 'ServerStarted') {
        model = new Model(tmptest, githubUrl, [], null, null , true)
        setTimeout(() => {
          fakeCloud.send('clientState')
        }, 1000)
      }
    })
  })

  describe('test appifi communicate', () => {
    beforeEach(() => {
      rimraf.sync(path.join(tmptest, 'tmp'))
      mkdirp.sync(path.join(tmptest, 'tmp'))
      rimraf.sync(path.join(tmptest, 'appifi'))
      child.execSync(`cp -r ${ path.join(process.cwd(), 'testdata/appifi')}  ${ tmptest }`)
    })

    it('should send no user to appifi', function(done) {
      this.timeout(0)
      fakeCloud = child.fork('./test/lib/fakeCloud.js')
      fakeCloud.on('message', data => {
        let obj = JSON.parse(data)
        if (obj.type === 'clientState'){
          expect(obj.state).to.deep.equal('true')
          if(obj.state === 'true') {
            fakeCloud.send('sendNoAccount')
            setTimeout(() => {
              expect(model.account.user).to.equal(undefined)
              let obj = JSON.parse(fs.readFileSync(path.join(tmptest, 'tmp/user')).toString())
              expect(obj.user).to.be.equal(null)
              done()
            }, 1000)
          } else {
            console.log('client not found')
            done(new Error('client not found'))
          }
        }
        if (obj.type === 'ServerStarted') {
          model = new Model(tmptest, githubUrl, [], null, '1.0.14' , true)
          setTimeout(() => {
            fakeCloud.send('clientState')
          }, 1000)
        }
      })
    })

    it('should send user to appifi', function(done) {
      this.timeout(0)
      fakeCloud = child.fork('./test/lib/fakeCloud.js')
      fakeCloud.on('message', data => {
        let obj = JSON.parse(data)
        if (obj.type === 'clientState'){
          expect(obj.state).to.deep.equal('true')
          if(obj.state === 'true') {
            fakeCloud.send('sendAccountInfo')
            setTimeout(() => {
              expect(model.account.user).to.deep.equal(accountInfo)
              let obj = JSON.parse(fs.readFileSync(path.join(tmptest, 'tmp/user')).toString())
              expect(obj.user).to.be.deep.equal(accountInfo)
              done()
            }, 1000)
          } else {
            console.log('client not found')
            done(new Error('client not found'))
          }
        }
        if (obj.type === 'ServerStarted') {
          model = new Model(tmptest, githubUrl, [], null, '1.0.14' , true)
          setTimeout(() => {
            fakeCloud.send('clientState')
          }, 1000)
        }
      })
    })
  })

  afterEach(done => {
    if(fakeCloud) fakeCloud.kill()
    fakeCloud = undefined
    if(model) model.destroy()
    model = undefined
    done()
  })
})
const child = require('child_process')
const fs = require('fs')
const path = require('path')

const cwd = process.cwd()
const tmptest = path.join(cwd, 'tmptest') 
const Model = require('../../src/models')

const powerPath = path.join(tmptest, 'power')
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

process.on("close", () => {
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
    rimraf.sync(powerPath)
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
        }
      }

      if (obj.type === "CLOUD_HARDWARE_MESSAGE") {
        expect(obj.isAuth).to.equal(false)
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
          setTimeout( () => child.execSync(`echo 1 > ${ path.join(tmptest, 'power') }`), 5000)
        } else {
          console.log('client not found')
        }
      }

      if (obj.type === "CLOUD_HARDWARE_MESSAGE") {
        expect(obj.isAuth).to.equal(true)
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

  it('should save account info', function(done) {
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
          setTimeout( () => child.execSync(`echo 1 > ${ path.join(tmptest, 'power') }`), 5000)
        } else {
          console.log('client not found')
        }
      }

      if (obj.type === "CLOUD_HARDWARE_MESSAGE") {
        expect(obj.isAuth).to.equal(true)
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

  afterEach(done => {
    if(fakeCloud) fakeCloud.kill()
    fakeCloud = undefined
    if(model) model.destroy()
    model = undefined
    done()
  })
})
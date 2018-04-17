const child = require('child_process')
const fs = require('fs')
const path = require('path')

const cwd = process.cwd()
const tmptest = path.join(cwd, 'tmptest') 
const Device = require('../../src/models/device')

const powerPath = path.join(tmptest, 'power')

const rimraf = require('rimraf')
const mkdirp = require('mkdirp')
const expect = require('chai').expect

describe(path.basename(__filename), () => {

  beforeEach(() => {
    rimraf.sync(powerPath)
  })

  it('should timeout  of observe enter auth state', function(done) {
    this.timeout(12 * 1000)
    let device = new Device()
    device.addEnterAuthListener((err, isEnter) => {
      if(err) return done(err)
      expect(isEnter).to.equal(false)
      done()
    })
  })

  it('should timeout  of observe exit auth state', function(done) {
    this.timeout(41 * 1000)
    let device = new Device()
    device.addExitAuthListener((err, isEnter) => {
      if(err) return done(err)
      expect(isEnter).to.equal(false)
      done()
    })
  })

  it('should  success  of observe enter auth state', function(done) {
    this.timeout(12 * 1000)
    let device = new Device()
    device.addEnterAuthListener((err, isEnter) => {
      if(err) return done(err)
      expect(isEnter).to.equal(true)
      done()
    })
    setTimeout(() => {
      device.requestAuth(3000, () => {})
    }, 3000)
  })

  it.only('should return true of observe exit auth state', function(done) {
    this.timeout(41 * 1000)
    let device = new Device()
    device.addExitAuthListener((err, isExit) => {
      if(err) return done(err)
      expect(isExit).to.equal(true)
      done()
    })
    setTimeout(() => {
      device.requestAuth(3000, () => {})
    }, 3000)
  })
})
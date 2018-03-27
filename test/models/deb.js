const Promise = require('bluebird')
const path = require('path')
const fs = Promise.promisifyAll(require('fs'))

const rimraf = require('rimraf')
const rimrafAsync = Promise.promisify(rimraf)
const mkdirp = require('mkdirp')
const mkdirpAsync = Promise.promisify(mkdirp)

const expect = require('chai').expect

const Deb = require('src/models/deb')

const cwd = process.cwd()
const tmptest = path.join(cwd, 'tmptest') 

describe(path.basename(__filename), () => {

  beforeEach(async () => {
    await Promise.delay(1000)
  })

  it.skip('new deb', function (done) {
    this.timeout(30 * 60 * 1000)
    let deb = new Deb([], true)
    deb.on('Stopped', done)
  })

  it('new deb with ffmpeg', function (done) {
    this.timeout(30 * 60 * 1000)
    let names = ['ffmpeg']
    let deb = new Deb(names, false)
    deb.on('Stopped', done)
  })
})

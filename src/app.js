const Promise = require('bluebird')
const path = require('path')
const fs = Promise.promisifyAll(require('fs'))
const child = require('child_process')

const mkdirp = require('mkdirp')
const mkdirpAsync = Promise.promisify(mkdirp)
const rimraf = require('rimraf')
const rimrafAsync = Promise.promisify(rimraf)

const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')

const hostname = require('./lib/hostname')
const init = require('./init')

const appRouter = require('./router/app')
const Auth = require('./middleware/Auth')
const createApp = require('./lib/express')
const Channel = require('./models/channel')

/** constants **/
const githubUrl = 'https://api.github.com/repos/wisnuc/appifi-release/releases'

const rootarg = process.argv
  .find((arg, idx, arr) => {
    if (idx === 0) return false
    if (arr[idx - 1] === '--root') return true
    return false
  })

const root = (rootarg && path.resolve(rootarg)) || '/wisnuc'

console.log(`root is ${root}`)

const html = `
<html>
  <title>WISNUC Bootstrap</title>
  <body>
    <p>请使用PC，Mac或移动应用程序访问此页面。</p>
    <p>請使用PC，Mac或移動應用程序訪問此頁面。</p>
    <p>Please use PC, Mac, or mobile apps to access this page.</p>
  </body>
</html>
`

const createApp1 = (err, model) => {
  let auth = new Auth('some secret', [])
  let opts = {
    auth: auth.middleware,
    setttings: { json: { spaces: 2 } },
    log: { skip: 'no', error: 'all' },
    routers: []
  }

  opts.routers.push(err ? ['/v1', createErrorRouter(err)] : ['/v1', appRouter(auth, model)])

  return createApp(opts)
}

const createErrorRouter = err => {
  let router = express.Router()
  router.get('/v1', (req, res) => res.status(503).json({ message: err.message, code: err.code }))
  return router
}

init(root, githubUrl, (err, model) => {
  let app
  if (err) {
    console.log('init error', err)
    if (err.code === 'EACCES') {
      console.log('You probably need sudo or root permission to run this program.')
      process.exit(1)
    } else {
      app = createApp1(err)
    }
  } else 
    app = createApp1(null, model)

  let options = {
    key: fs.readFileSync('testdata/client-key.pem'),
    cert: fs.readFileSync('testdata/client-cert.pem'),
    ca: [ fs.readFileSync('testdata/ca-cert.pem') ]
  }
     

  new Channel(model, options)
  
  app.listen(3001, err => {
    if (err) {
      console.log('failed to listen on port 3001, process exit')
      return process.exit(1)
    } else {
      console.log('Bootstrap started')
    }

    // hostname(err => {
    //   // do it anyway, for sometimes avahi-set-host-name failed for 'redundant'
    //   let broadcast = child.spawn('avahi-publish-service' ,['Wisnuc Appifi Boostrap', '_http._tcp' , '3001'])
    //   broadcast.on('error', err => console.log('broadcast error', err))
    //   broadcast.on('close', (code, signal) => {
    //     console.log(`broadcast exit with code ${code} and signal ${signal}, no retry, please restart service`)
    //   })
    // })
  }) 

})





const express = require('express')
const deviceInfo = require('../lib/device')()

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

module.exports = (auth, model) => {
  let router = express.Router()
  // GET whole view
  router.get('/', (req, res) => res.status(200).json(model.view()))

  // control betaOn or betaOff
  router.patch('/', (req, res) => {
    let { betaOn } = req.body 
    if (typeof betaOn !== 'boolean') {
      res.status(400).json({ message: 'betaOn must be a boolean value' })
    } else {
      model.setBeta(betaOn)
      res.status(200).end()
    }
  })

  router.get('/user', auth.jwt(), (req, res, next) => {
     res.status(200).json(model.account.user ? Object.assign({}, model.account.user, { password: undefined }) : null)
  })

  router.patch('/user/password', (req, res, next) => { 
    model.account.updateUserPassword(req.body, (err, data) => {
      err ? next(err) : res.status(200).json(data)
    })
  })

  router.get('/observe/:observeName', (req, res, next) => {
    let observeName = req.params.observeName
    if (observeName === 'enterAuth') {
      model.device.addEnterAuthListener((err, isEnter) => {
        if(err) return next(err)
        res.status(200).json({ success: isEnter })
      })
    } else if (observeName === 'exitAuth') {
      model.device.addExitAuthListener((err, isExit) => {
        if(err) return next(err)
        res.status(200).json({ success: isExit })
      })
    } else {
      res.status(404).json()
    }
  })

  router.get('/platinum', (req, res, next) => res.status(200).json({ status: model.platinum.isOn() }))

  router.post('/platinum', (req, res, next) => {
    let isOn = res.body.status
    if (typeof isOn !== 'boolean') {
      return next(Object.assign(new Error('status error'), { status: 400 }))
    } else {
      model.platinum.setOnOff(isOn, err ? next(err) : res.status(200).end())
    }
  })

  router.get('/info', (req, res, next) => {
    res.status(200).json({
      deviceSN: deviceInfo.deviceSN,
      deviceModel: deviceInfo.deviceModel,
      boundUser: model.account.user ? { phicommUserId: model.account.user.phicommUserId} : null,
      netState: model.channel.getState().toUpperCase()
    })
  })

  // Install App
  router.put('/app', (req, res, next) => 
    model.appInstall(req.body.tagName, err => err ? next(err) : res.status(200).end()))

  // Start or Stop App
  router.patch('/app', (req, res, next) => {
    let { state } = req.body
    if (state !== 'Started' && state !== 'Stopped') {
      res.status(400).json({ message: 'state must be either Started or Stopped'})
    } else {
      if (state === 'Started') {
        model.appStart(err => err ? next(err) : res.status(200).end())
      } else {
        model.appStop(err => err ? next(err) : res.status(200).end())
      }
    }
  })

  // Start or stop download instantly
  router.patch('/releases/:tagName', (req, res, next) => {
    let { state } = req.body
    if (state !== 'Ready' && state !== 'Stopped') {
      res.status(400).json({ message: 'state must be either Ready or Stopped'})
    } else {
      if (state === 'Ready') {
        model.releaseStart(req.params.tagName, err => err ? next(err) : res.status(200).end())
      } else {
        model.releaseStop(req.params.tagName, err => err ? next(err) : res.status(200).end())
      }
    }
  })

  // Start refresh instantly
  router.patch('/fetch', (req, res, next) => 
    model.fetchStart(err => err ? next(err) : res.status(200).end()))

  return router
}

const express = require('express')

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

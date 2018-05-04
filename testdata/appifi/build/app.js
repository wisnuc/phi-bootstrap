const path = require('path')
const fs = require('fs')


const express = require('express')

const App = express()

process.on('message', message => {
  let obj = JSON.parse(message)
  if(obj.type === 'APPIFI_ACCOUNT_INFO_MESSAGE') {
    fs.writeFileSync(path.join(process.cwd(), '../tmp/user'))
    fs.writeFileSync(path.join(process.cwd(), '../tmp/user'), message)
  }else
    console.log(message)
})

App.listen(12241, () => {
  console.log('appifi started')
})
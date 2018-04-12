const tls = require('tls')
const fs = require('fs')
const path = require('path')

const options = {
  key: fs.readFileSync(path.join(__dirname,'../../testdata/server-key.pem')),
  cert: fs.readFileSync(path.join(__dirname,'../../testdata/server-cert.pem')),

  // This is necessary only if using the client certificate authentication.
  requestCert: true,
  // This option only has an effect when requestCert is true and defaults to true.
  // rejectUnauthorized: true,

  ca: [ fs.readFileSync(path.join(__dirname,'../../testdata/ca-cert.pem')) ]
}

let client = null

const server = tls.createServer(options, socket => {
  client = socket
  // console.log('server connected', socket.authorized ? 'authorized' : 'unauthorized')
  socket.write(`hello, welcome to server!\n`)
  socket.setEncoding('utf8')
  socket.on('data', data => {
    process.send(data)
  })
  socket.on('error', err => console.log('error', err))
})

server.listen(8000, () => {
  // console.log('server bound')
  process.send(JSON.stringify({ type:"ServerStarted"}))
})

process.on('message', data => {
  let obj
  if (data === 'sendHardwareReq') {
    obj = {
      type: "CLOUD_HARDWARE_MESSAGE"
    }
    // console.log('need sendHardwareReq')
    client.write(JSON.stringify(obj))
  } else if(data === 'clientState') {
    process.send(JSON.stringify({ type:'clientState' ,state: client ? 'true' : 'false'}))
  } else if(data === 'sendAccountInfo') {
    obj = {
      type: "CLOUD_ACCOUNT_INFO_MESSAGE",
      user: {
        uid: "5253e843-a289-45e3-8fb8-a1b9bbdb45ef",
        password: '$2a$10$nUmDoy9SDdkPlj9yuYf2HulnbtvbF0Ei6rGF1G1UKUkJcldINaJVy', // password: 'alice'
        username: "JackYang"
      }
    }
    console.log('start notify account')
    client.write(JSON.stringify(obj))
  }else if(data === 'sendAccountChangePwd') {
    obj = {
      type:'CLOUD_CHANGE_PASSWARD_MESSAGE',
      user: {
        password: '$2a$10$nUmDoy9SDdkPlj9yuYf2HulnbtvbF0Ei6rGF1G1UKUkJcldINaJVy' // password: 'alice'
      }
    }
    client.write(JSON.stringify(obj))
  }
})
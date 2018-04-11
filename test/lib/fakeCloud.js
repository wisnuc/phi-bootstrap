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
  console.log('server connected', socket.authorized ? 'authorized' : 'unauthorized')
  socket.write(`hello, welcome to server!\n`)
  socket.setEncoding('utf8')
  socket.on('data', data => {
    process.send(data)
  })
  socket.on('error', err => console.log('error', err))
})

server.listen(8000, () => {
  console.log('server bound')
  process.send(JSON.stringify({ type:"ServerStarted"}))
})

process.on('message', data => {
  let obj
  if (data === 'sendHardwareReq') {
    obj = {
      type: "CLOUD_HARDWARE_MESSAGE"
    }
    console.log('need sendHardwareReq')
    client.write(JSON.stringify(obj))
  } else if(data === 'clientState') {
    process.send(JSON.stringify({ type:'clientState' ,state: client ? 'true' : 'false'}))
  }
})
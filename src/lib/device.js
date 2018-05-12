const fs = require('fs')
const path = require('path')
const os = require('os')
/**
142 chroot ${TARGET} /bin/bash -c "apt -y install sudo initramfs-tools openssh-server parted vim-common tzdata net-tools iputils-ping"
143 chroot ${TARGET} /bin/bash -c "apt -y install avahi-daemon avahi-utils btrfs-tools udisks2"
144 chroot ${TARGET} /bin/bash -c "apt -y install libimage-exiftool-perl imagemagick ffmpeg"
145 chroot ${TARGET} /bin/bash -c "apt -y install samba rsyslog minidlna"
**/

const deviceSN = () => {
  return 'wjagqq9nq6npzw837'
}

//
// let options = {
//   key: fs.readFileSync(path.join(process.cwd(), 'testdata/clientkey.pem')),
//   cert: fs.readFileSync(path.join(process.cwd(), 'testdata/clientcert.pem')),
//   ca: [ fs.readFileSync(path.join(process.cwd(), 'testdata/ca-cert.pem')) ]
// }

const deviceSecret = () => {
  let secret = {
    key: fs.readFileSync(path.join(process.cwd(), `testdata/phi-ssl/${ deviceSN() }-key.pem`)),
    cert: fs.readFileSync(path.join(process.cwd(), `testdata/phi-ssl/${ deviceSN() }-cert.pem`))
  }
  return secret
}

const deviceModel = () => {
  return 'PhiNAS2'
}

const softwareVersion = () => {
  return 'v1.0.0'
}

const hardwareVersion = () => {
  return 'v1.0.0'
}

const networkInterface = () => {
  let interfaces = os.networkInterfaces()
    
  let keys = Object.keys(interfaces).filter(k => !!k && k !== 'lo')
  if (!keys.length) return 

  let key = keys.find(k => Array.isArray(interfaces[k]) && interfaces[k].length)
  if (!key) return
  let ipv4 = interfaces[key].find(x => x.family === 'IPv4')
  return ipv4
}

const memory = () => {
  return {
    free: os.freemem(),
    total: os.totalmem()
  }
}

/** 
 * cpus: os.cpus(),
 * memory: memory(), 
 */
module.exports = () => {
  return {
    deviceSN: deviceSN(),
    deviceSecret: deviceSecret(),
    deviceModel: deviceModel(),
    softwareVersion: softwareVersion(),
    hardwareVersion: hardwareVersion(),
    net: networkInterface()
  }
}
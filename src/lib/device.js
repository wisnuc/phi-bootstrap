const fs = require('fs')
const path = require('path')
/**
142 chroot ${TARGET} /bin/bash -c "apt -y install sudo initramfs-tools openssh-server parted vim-common tzdata net-tools iputils-ping"
143 chroot ${TARGET} /bin/bash -c "apt -y install avahi-daemon avahi-utils btrfs-tools udisks2"
144 chroot ${TARGET} /bin/bash -c "apt -y install libimage-exiftool-perl imagemagick ffmpeg"
145 chroot ${TARGET} /bin/bash -c "apt -y install samba rsyslog minidlna"
**/

const deviceSN = () => {
  return '1plp0panrup3jqphe'
}

//ca: [ fs.readFileSync(path.join(process.cwd(), 'testdata/ca-cert.pem')) ]
// let options = {
//   key: fs.readFileSync(path.join(process.cwd(), 'testdata/clientkey.pem')),
//   cert: fs.readFileSync(path.join(process.cwd(), 'testdata/clientcert.pem'))
// }

const deviceSecret = () => {
  let secret = {
    key: fs.readFileSync(path.join(process.cwd(), 'testdata/clientkey.pem')),
    cert: fs.readFileSync(path.join(process.cwd(), 'testdata/clientcert.pem'))
  }
  return secret
}

const deviceModel = () => {
  return 'PhiNAS2'
}

module.exports = () => {
  return {
    deviceSN: deviceSN(),
    deviceSecret: deviceSecret(),
    deviceModel: deviceModel()
  }
}
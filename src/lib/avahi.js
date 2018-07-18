const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))
const child = Promise.promisifyAll(require('child_process'))
const path = require('path')
const UUID = require('uuid')

const avahiDaemonConfP = '/etc/avahi/avahi-daemon.conf'
const phicommServiceConfP = '/etc/avahi/services/phicomm.service'

const genDaemonConf = hostname => {
  return `
  [server]
  host-name=${ hostname }
  use-ipv4=yes
  use-ipv6=yes
  ratelimit-interval-usec=1000000
  ratelimit-burst=1000
  
  [wide-area]
  enable-wide-area=yes
  
  [publish]
  publish-hinfo=no
  publish-workstation=no
  
  [reflector]
  #enable-reflector=no
  #reflect-ipv=no
  
  [rlimits]
  rlimit-core=0
  rlimit-data=4194304
  rlimit-fsize=0
  rlimit-nofile=768
  rlimit-stack=4194304
  rlimit-nproc=3
  `
}

const genServiceConf = `
<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <name>Phicomm Bootstrap</name>
  <service>
    <type>_http._tcp</type>
    <port>3001</port>
  </service>
</service-group>
`

const startAvahiAsync = async (tmpDir, hostname) => {
  let tmpDaemonP = path.join(tmpDir, UUID.v4())
  await fs.writeFileAsync(tmpDaemonP, genDaemonConf(hostname))
  await fs.renameAsync(tmpDaemonP, avahiDaemonConfP)

  let tmpServiceP = path.join(tmpDir, UUID.v4())
  await fs.writeFileAsync(tmpDaemonP, genServiceConf)
  await fs.renameAsync(tmpDaemonP, avahiDaemonConfP)

  await child.execAsync(`systemctl restart avahi-daemon.service`)
}

module.exports = startAvahiAsync
const os = require('os')

module.exports.getNetInfo = () => {
  let interfaces = os.networkInterfaces()
    
  let keys = Object.keys(interfaces).filter(k => !!k && k !== 'lo')
  if (!keys.length) return 

  let key = keys.find(k => Array.isArray(interfaces[k]) && interfaces[k].length)
  if (!key) return
  let ipv4 = interfaces[key].find(x => x.family === 'IPv4')
  return ipv4
}
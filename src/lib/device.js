const fs = require('fs')
const path = require('path')
const os = require('os')
/**
142 chroot ${TARGET} /bin/bash -c "apt -y install sudo initramfs-tools openssh-server parted vim-common tzdata net-tools iputils-ping"
143 chroot ${TARGET} /bin/bash -c "apt -y install avahi-daemon avahi-utils btrfs-tools udisks2"
144 chroot ${TARGET} /bin/bash -c "apt -y install libimage-exiftool-perl imagemagick ffmpeg"
145 chroot ${TARGET} /bin/bash -c "apt -y install samba rsyslog minidlna"
**/

const _device = (() => {
  let sn, key, cert
  try {
    sn = fs.readFileSync('/phi/ssl/deviceSN').toString('utf8')
    key = fs.readFileSync('/phi/ssl/key.pem').toString('utf8')
    cert = fs.readFileSync('/phi/ssl/cert.pem').toString('utf8')
    return { sn, key, cert }
  } catch (e) {
    return {
      sn: 'wjagqq9nq6npzw837',
      key: `-----BEGIN PRIVATE KEY-----
      MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCXhb0b0NOLYk4e
      j+Ca9JO5mP9hziw/pb9VbvOIGc9YRrY6TPxkpDJyzmA+5LbNY01iDc/5coUe1lbY
      zf38ZaExsCCtCUYWqULS75Vq/6+fhrpFhOm9HJZ1l+5/Kif+HyIRYEG08UpoYgEr
      rByIVzR0zmj5LBqjJ2LRLmR83aL+W8MiuSNTkh4n6ZdHWPEDx1naKNufrFBK12Dm
      r+PMb3UEHqZpG56lFF8S1aO8mM5+UiHmSBEPrQA4SJNCLrzmyTF0GNhstRZhljf7
      yvx9OWw30KwwMEx5RQeSlt2f6yJ09iZJoXKmsYyUOGIBnXjbBUnx6DypFyplUAZD
      tQpc8uTZAgMBAAECggEAJxWnXypxtu2Hqxh/3liiVmihz4/IGC7f+OCizwOhWWr8
      DHPZUviLztNvPinvAXHQ/y8C65xfvEGbq1cPYfCxMMj21MukmanVg+WrDCuiGKs/
      FzmetVpPcUvciE7OfB15wzOqH0tyXxSQqrw9q+marVqk90kqIdXCBqVJ5G+jYKrT
      JOieiJEq6CFLpfp9WnhFKas0BPuaQHXPiNx8Ikzfp++ED/ZpQBPHAqsP12a5efAq
      tInvriiTQeCYNCIOejfVESUxKqhSz95ZnQjUP0+oAy+cDg0bus8wyGYfTJYNok4T
      HCXo6mapSWmtqvX2gfS4zQTOTQzHvFs98ig6+b1kAQKBgQDOln0Sr63iEntfWFyN
      27xLFmwgVfR4+PZaFUuXx7nW7wqHI4LRGfnlBysdUUT9xSs3EqesxQ0DRLSCToA1
      IRoWoV9+q+oj1UVeEqeCsVO4k56r+ZI4+MrxLnVjXqXTNYeoYxd5dws9/sRScCyX
      KSgO9W5SSlLz19NzgrBOFrcnWQKBgQC7w46mkpotEnG4UMe6gSNHEaEs3Gse7qh/
      CBbxvIU//70nQqbiEgvYypf3dUSg2EMW6ehw47Dpg/0R1ZZ5K3VbxhNIZqbK/ZI7
      u0cLIENMaS/gidQJHV0+0LISYBUTCDFWFcVlMxvXClDdwGvoUE598Hky7LRr9iiR
      ZnFfXqd5gQKBgEin4psU0DnHOD6jLAH0OvfJjgOdV1rIbJPoE2rxImn2LiSzF4oE
      8b9b0wz/jR0XIAjBddksgFQa8MU3aJ3G4477+ELroXAyzK+2LdWoGgK7YD2pi4Sf
      83f5V+231ug+VlShbRsaBAkstc0siHItVlpUdRVZ8Gy0BjkEyI7eLFIZAoGBAILF
      NHj26cIycll4iWJvxm4c7TAdY83rUhcHP1OlhPiJ2OebGDejcfTPRP/oAKA1fqRa
      zLSzH+fDMWJWa7KAfgAo+A0Y0VnXOR241UX+dmClcd7kn3SpquOw3hTGLmdO8W2P
      RCezbNRcLu4CsiTeqYw1C3RYP2Bh1OdPfe56MhIBAoGAIbwjKO5pykUdynl36XFF
      3xfheq1OjNvtssssFsxW4YkWeFiWy4UBkKIuzScR+44snRa8XrTXUv0KcjBRsHNI
      FId0k+vI45118M4YZWAF1McEC+fXz4x7QsG0PTqVexP0qkAqQYIJ9ay6KVhhnWwx
      7vp2H/QDDf3ub7GYUFvj+mM=
      -----END PRIVATE KEY-----`,
      cert: `-----BEGIN CERTIFICATE-----
      MIID6jCCAtKgAwIBAgIEKMFDRzANBgkqhkiG9w0BAQsFADCBkzELMAkGA1UEBhMC
      Q04xDzANBgNVBAgMBuS4iua1tzEPMA0GA1UEBwwG5LiK5rW3MTMwMQYDVQQKDCrk
      uIrmtbfmlpDorq/mlbDmja7pgJrkv6HmioDmnK/mnInpmZDlhazlj7gxEzARBgNV
      BAsTClNtYXJ0IERhdGExGDAWBgNVBAMTD3d3dy5waGljb21tLmNvbTAeFw0xODA1
      MDgwNTE2MjdaFw0xODA4MDYwNTE2MjdaMIGVMQswCQYDVQQGEwJDTjEPMA0GA1UE
      CAwG5LiK5rW3MQ8wDQYDVQQHDAbkuIrmtbcxMzAxBgNVBAoMKuS4iua1t+aWkOiu
      r+aVsOaNrumAmuS/oeaKgOacr+aciemZkOWFrOWPuDETMBEGA1UECxMKU21hcnQg
      RGF0YTEaMBgGA1UEAxMRd2phZ3FxOW5xNm5wenc4MzcwggEiMA0GCSqGSIb3DQEB
      AQUAA4IBDwAwggEKAoIBAQCXhb0b0NOLYk4ej+Ca9JO5mP9hziw/pb9VbvOIGc9Y
      RrY6TPxkpDJyzmA+5LbNY01iDc/5coUe1lbYzf38ZaExsCCtCUYWqULS75Vq/6+f
      hrpFhOm9HJZ1l+5/Kif+HyIRYEG08UpoYgErrByIVzR0zmj5LBqjJ2LRLmR83aL+
      W8MiuSNTkh4n6ZdHWPEDx1naKNufrFBK12Dmr+PMb3UEHqZpG56lFF8S1aO8mM5+
      UiHmSBEPrQA4SJNCLrzmyTF0GNhstRZhljf7yvx9OWw30KwwMEx5RQeSlt2f6yJ0
      9iZJoXKmsYyUOGIBnXjbBUnx6DypFyplUAZDtQpc8uTZAgMBAAGjQjBAMB8GA1Ud
      IwQYMBaAFOv5PMXcycIH8gF3a3yakQyZjgR2MB0GA1UdDgQWBBQUof358lrAPUjL
      vczIfSW7cy/6XzANBgkqhkiG9w0BAQsFAAOCAQEAsRURGuF2HMprAT/Ot1DzvlfH
      qN3iEBY+eSR2GC0VY7s+E1CybGKOML21PNSOSNXyXUUPVViQ7ntGXdJ0O27iHCdl
      bypkgzX5b/y85uxyM3ejYyDe2U1BLyMp8/0tMqdykegL4xdhBEZcAMtRHllQ8yTG
      MrPTH0FxqbDIgq/OHkjgzawc43wZzQBBgW4KWnLSTQfNEG24dmLZrfcqZucMDKGo
      wUzrQRT2S9wCQ0g0c2N1mMziKS2cdmHBL/f6RW4SweHxEoRDaXoI+02R/6UvTbj1
      DXtfJSCnLwSNNv7wTwymyvZkJOpuo4sJOP5T3JXye4chvYEYy8G+sEktR6DKLw==
      -----END CERTIFICATE-----
      -----BEGIN CERTIFICATE-----
      MIIDxzCCAq+gAwIBAgIEE6Pj2jANBgkqhkiG9w0BAQsFADCBkzELMAkGA1UEBhMC
      Q04xDzANBgNVBAgMBuS4iua1tzEPMA0GA1UEBwwG5LiK5rW3MTMwMQYDVQQKDCrk
      uIrmtbfmlpDorq/mlbDmja7pgJrkv6HmioDmnK/mnInpmZDlhazlj7gxEzARBgNV
      BAsTClNtYXJ0IERhdGExGDAWBgNVBAMTD3d3dy5waGljb21tLmNvbTAeFw0xODA1
      MDgwNTE1NTNaFw0xOTA1MDgwNTE1NTNaMIGTMQswCQYDVQQGEwJDTjEPMA0GA1UE
      CAwG5LiK5rW3MQ8wDQYDVQQHDAbkuIrmtbcxMzAxBgNVBAoMKuS4iua1t+aWkOiu
      r+aVsOaNrumAmuS/oeaKgOacr+aciemZkOWFrOWPuDETMBEGA1UECxMKU21hcnQg
      RGF0YTEYMBYGA1UEAxMPd3d3LnBoaWNvbW0uY29tMIIBIjANBgkqhkiG9w0BAQEF
      AAOCAQ8AMIIBCgKCAQEAx7mQzcj7T2qXZu2DBvHlgfmRNDq2Z7fo15rr9JPdG4bW
      V3LWCDmKJPsKlAT+6ri56oiPM2feqowi2QyMevUbAAMaqnRE8oW9JP/FLJvdRFI1
      favEax1iUnoMJJe+SkE/DmFjKxY0PDnjJV/NI6Kb0hFhwA2jTmKR3ve/ro2Aox+m
      ExrPVllBKpF9A4FWpuo4+/Z9YDluAULQaD3GsOt5wlmo2bYkhvh2otU3Box+uI7+
      3vesXJp5rSuHiMmR97+WgLtDXzSSOw+XsUma3y4BBDbBQ5J957sdRbNF0FrJ2hmC
      iyHabObeCMz32eBxALVV4Mlzp23BOpx1nI+K/WZWUQIDAQABoyEwHzAdBgNVHQ4E
      FgQU6/k8xdzJwgfyAXdrfJqRDJmOBHYwDQYJKoZIhvcNAQELBQADggEBAGlF3MTL
      bPswzNWyPBTYFz//FKzR7175hpeirOooHgeT+iWSxCyKVusDMIJ8mO6cE3pybhVW
      xuK0dkZd422DzkX+Th7fwWH0IBKozxK4pMVXBF+cG8JLXnvHj3Tk6FbdbyC4hEfk
      Rp9822rYCjgGpk0JUMYUxAroM7NroBz2Hzrpb8lNlY35B0eZNsfLzswF/+CFZxGs
      WJbzPFipyYZ7uVWCq9OBIj6Fx+HppPjVRLtkB1M3QRNpUptcVrSPVr412tduFMkM
      GevpGIEE7ueqJMKfbW42twNgA2gwCaoBchwy9p5JpjEXOJLbRhbECgAfDVe21yY9
      AXuuKN7jumXw0O0=
      -----END CERTIFICATE-----`,
    }
  }
})()

const deviceSN = () => _device.sn

//
// let options = {
//   key: fs.readFileSync(path.join(process.cwd(), 'testdata/clientkey.pem')),
//   cert: fs.readFileSync(path.join(process.cwd(), 'testdata/clientcert.pem')),
//   ca: [ fs.readFileSync(path.join(process.cwd(), 'testdata/ca-cert.pem')) ]
// }

const deviceSecret = () => ({ key: _device.key, cert: _device.cert })

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

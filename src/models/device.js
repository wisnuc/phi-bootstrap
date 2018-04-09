

const POWER_EVENT = '../../tmptest/power'

const LED_EVENT = '../../tmptest/led'

class Device {

  constructor() {

    this.isAuthing = false

    this.nextBtnState = 'Idle'

    this.authTimer = null
  }
  
  requestAuth (timeout, callback) {
    if (this.isAuthing) return process.nextTick(() => callback(new Error('BUSY')))
    this.changeLedState('Auth')

  }

  changeLedState (state) {
    if (this.isAuthing) {
      return this.nextBtnState = state
    } 
    if (state === 'Auth') {
      this.isAuthing = true
      this.authTimer = setTimeout(() => {
        
      }, 30 * 1000)
    }
  }

  pollingPowerButton(timeout, callback) {
    
    let loopTimer = setInterval(() => {
      fs.readFile(POWER_EVENT, (err, data) => {
        if(err) {
          return 
        }
        let read = data.toString().trim()
        if(parseInt(read) === 1) {
          clearInterval(loopTimer)
          clearTimeout(timeoutTimer)
          callback(true)
        }
      })
    }, 500)

    let timeoutTimer = setTimeout(() => {
      clearInterval(loopTimer)
      clearTimeout(timeoutTimer)
      callback(false)
    }, timeout)
  }


}
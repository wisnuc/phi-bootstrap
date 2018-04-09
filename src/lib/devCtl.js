

class State {

  constructor (ctx, ...args) {
    this.ctx = ctx
    ctx.state = this
    this.enter(...args)
  }

  setState (state, ...args) {
    this.exit()
    let NextState = this.ctx[state]
    new NextState(this.ctx, ...args)
  }

  enter () {
    debug(`${this.ctx.constructor.name} enter ${this.constructor.name} state`)
  }

  exit () {
    debug(`${this.ctx.constructor.name} exit ${this.constructor.name} state`)
  }

  view () {
    return null
  }

  destroy () {
    this.exit()
  }

  changeState(...args) {

  }

}

class Idle extends State {
  changeState(...args) {
    this.setState('Working', ...args)
  }
}

class Working extends State {
  
  enter(state, index) {
    if (state === 'AuthState') 
      this.nextState = this.currentState()
    this.startChange()
  }

  currentState() {
    return ''
  }

  startChange() {
    
    //finshed
    if(this.nextState)
      return this.enter(this.nextState, index)
    this.setState('Idle')
  }

  changeState(state) {
    this.nextState = state
  }

  exit() {

  }
}


class DevCtl {

  constructor() {

  }

  

}
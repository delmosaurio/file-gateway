/*!
 * This file is part of file-demand.
 *
 * please see the LICENSE
 */

var extend = require("extend")
  , fs = require("graceful-fs")

/**
 * 
 * Initialize a new Store with `conf`.
 *
 */
var Store = module.exports = function(ops) {
  var self = this

  if(false === (self instanceof Store)) {
    return new Store()
  }

  self.config(ops) 

  self.cache = {}
  self.expireds = {}

  return self
}

/**
 *  
 * Configure the Store instance
 *
 * @param {Object} conf
 */
Store.prototype.config = function(conf) {
  var self = this

  conf = conf || {}

  self.conf = { cache: {} }
  self.conf.cache = extend(false, 
                      { expire:((1000 * 60) * 10 ), length: 20  },
                      conf.cache || {}
                    )

  return self
}

/**
 *  
 * Add object to store
 *
 * @param {String} key
 * @param {String} mode
 * @param {Object} content
 */
Store.prototype.set = function(key, content, ops) {
  var self = this

  self.check()

  if (self.exists(key)) delete self.cache[key]

  var st = self.cache[key] = {}

  st.mode = ops.mode
  st.json = ops.json === true
  st.key = key
  st.content = content

  // not expiration for static or temps
  if (st.mode.match(/(static|temp)/g))
    return self

  var expire = (new Date()).valueOf() + self.conf.cache.expire
  
  self.expireds[expire] = self.expireds[expire]
  if (self.expireds[expire] === undefined)
    self.expireds[expire] = []

  self.expireds[expire].push(st)

  return self
}

/**
 *  
 * Add object to store
 *
 * @param {Boolean} remove
 */
Store.prototype.get = function(key, remove) {
  var self = this

  self.check()

  if (!self.exists(key))
    throw new Error("The key `" + key + "` not found")

  return self.cache[key]
}

/**
 *  
 * Define if the key was cached and still exists
 *
 * @param {String} key
 */
Store.prototype.exists = function(key){
  var self = this
  
  var obj = self.cache[key];

  return !(obj === undefined || obj === null)
}


Store.prototype.stop = function(){
  this.stopped = true
  return this
}

Store.prototype.start = function(){
  this.stopped = false
  return this
}

Store.prototype.check = function(){
  var self = this

  // TODO: optimize this

  if (self.stopped === true) return

  if (self.checking === true) {
    process.nextTick(function(){
      self.check.apply(self)
    })
    return
  }

  self.checking = true

  var expireds = Object.keys(self.expireds).filter(function(e){
    return parseInt(e) < (new Date()).valueOf()
  })

  var len = Object.keys(self.cache).filter(function(key){
    return self.cache[key].mode.match(/(dynamic|cache)/ig)
  })

  if (expireds.length === 0 && len.length <= self.conf.cache.length) {
    self.checking = false
    return
  }

  expireds.forEach(function(e){
    var arr = self.expireds[e]
    for (var i = 0; i < arr.length; i++) {
      var obj = arr[i]

      // save if is dynamic
      if (obj.mode === "dynamic") {
        if (obj.json === true) {
          fs.writeFileSync(obj.key, JSON.stringify(obj.content))
        } else {
          fs.writeFileSync(obj.key, obj.content)
        }
      }
      delete self.cache[obj.key]
    };
    
    delete self.expireds[e]
    
  })

  var expCount = len.length - self.conf.cache.length
  var disposed = 1

  var exps = Object.keys(self.expireds).sort()
  
  while (disposed < expCount) {
        
    var e = self.expireds[exps[0]]
    var el = e.length

    var ts = el >= expCount ? expCount : el

    for (var i = 0; i < ts; i++) {
      var obj = e[i]
      if (obj !== undefined && obj !== null){
        delete self.cache[obj.key]
      }
    }
    
    e.slice(ts)

    disposed += ts

    if (e.length === ts) {
      exps = exps.slice(1)
      delete self.expireds[exps[0]]
    }
  }

  self.checking = false
}

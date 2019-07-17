class Message {
  constructor(from, content) { 
      this.from = from; 
      this.content = content; 
  }

  getFrom() { 
    return this.from; 
  }

  getContent() { 
    return this.content; 
  }
}

module.exports = Message; 
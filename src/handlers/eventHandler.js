const fs = require('fs');
const path = require('path');

module.exports = (client) => {
  let total = 0;
  const loadEvents = (dir) => {
    const files = fs.readdirSync(path.join(__dirname, `../events/${dir}`)).filter(file => file.endsWith('.js'));
    total += files.length;
    
    for (const file of files) {
      const event = require(`../events/${dir}/${file}`);
      const eventName = event.name || file.split('.')[0];
      
      if (event.rest) {
        if (event.once) {
          client.rest.once(eventName, (...args) => event.execute(...args, client));
        } else {
          client.rest.on(eventName, (...args) => event.execute(...args, client));
        }
      } else {
        if (event.once) {
          client.once(eventName, (...args) => event.execute(...args, client));
        } else {
          client.on(eventName, (...args) => event.execute(...args, client));
        }
      }
    }
  };

  ['client', 'node'].forEach(dir => {
    if (fs.existsSync(path.join(__dirname, `../events/${dir}`))) {
      loadEvents(dir);
    }
  });
  
  console.log(`✅ Loaded ${total} events`);
};

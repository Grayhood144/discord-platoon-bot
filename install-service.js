const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'Discord Platoon Bot',
  description: 'Discord bot for managing military-style platoons',
  script: path.join(__dirname, 'index.js'),
  nodeOptions: [],
  env: [{
    name: "NODE_ENV",
    value: "production"
  }]
});

// Listen for the install event
svc.on('install', function() {
  console.log('Service installed successfully!');
  console.log('Starting service...');
  svc.start();
});

// Listen for the start event
svc.on('start', function() {
  console.log('Service started successfully!');
  console.log('Bot is now running 24/7 as a Windows service.');
});

// Listen for the error event
svc.on('error', function(err) {
  console.error('Service error:', err);
});

// Install the service
console.log('Installing Discord Platoon Bot as Windows service...');
svc.install(); 
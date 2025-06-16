const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'Discord Platoon Bot',
  script: path.join(__dirname, 'index.js')
});

// Listen for the uninstall event
svc.on('uninstall', function() {
  console.log('Service uninstalled successfully!');
});

// Listen for the error event
svc.on('error', function(err) {
  console.error('Service error:', err);
});

// Uninstall the service
console.log('Uninstalling Discord Platoon Bot service...');
svc.uninstall(); 
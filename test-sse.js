const EventSource = require('eventsource');

const url = 'https://smartlogix-bb740-default-rtdb.asia-southeast1.firebasedatabase.app/trips.json';
console.log('Connecting to', url);

const source = new EventSource(url, { headers: { 'Accept': 'text/event-stream' } });

source.on('open', () => {
    console.log('SSE connection opened successfully');
});

source.on('put', (e) => {
    console.log('Received PUT event:', e.data);
    process.exit(0);
});

source.on('error', (err) => {
    console.error('SSE Error:', err);
    process.exit(1);
});

import { WebSocketServer } from 'ws';

export default function kilsocket(server) {
  // Attach WebSocket server to the existing HTTP server
  const wss = new WebSocketServer({ server });

  wss.on('connection', function connection(ws) {
    console.log("WebSocket connected");

    ws.on('message', function incoming(message) {
      // Broadcast to every other connected client
      wss.clients.forEach(function each(client) {
        if (client !== ws && client.readyState === ws.OPEN) {
          client.send(message);
        }
      });
    });

    // Send a welcome message to the newly connected client
    ws.send(JSON.stringify({ message: 'Hello, you are connected to the signaling server!' }));
  });

  console.log('WebSocket signaling server is active');
}

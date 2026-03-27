import { WebSocket, WebSocketServer } from 'ws';

const HOST = process.env.SIGNALING_HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || process.env.SIGNALING_PORT || 8080);
const rooms = new Map();
const relayTypes = new Set(['offer', 'answer', 'ice-candidate', 'media-state']);

const wss = new WebSocketServer({ host: HOST, port: PORT });

const send = (socket, payload) =>
	socket.readyState === WebSocket.OPEN && socket.send(JSON.stringify(payload));

const peersInRoom = (roomId) => rooms.get(roomId) || new Set();

const leaveRoom = (socket) => {
	if (!socket.roomId) return;
	const { roomId } = socket;
	const peers = peersInRoom(roomId);
	peers.delete(socket);
	for (const peer of peers) send(peer, { type: 'peer-left' });
	if (peers.size === 0) rooms.delete(roomId);
	socket.roomId = null;
};

wss.on('connection', (socket) => {
	socket.roomId = null;

	socket.on('message', (raw) => {
		let type, data;
		try {
			({ type, data } = JSON.parse(raw.toString()));
		} catch {
			return;
		}

		if (type === 'join') {
			const roomId = data?.roomId;
			if (!roomId) return;

			leaveRoom(socket);
			const peers = peersInRoom(roomId);
			if (peers.size >= 2) {
				send(socket, { type: 'room-full' });
				return;
			}

			socket.roomId = roomId;
			peers.add(socket);
			rooms.set(roomId, peers);
			send(socket, { type: 'joined', data: { roomId, peers: peers.size } });
			if (peers.size === 2) {
				const [a, b] = [...peers];
				send(a, { type: 'peer-ready', data: { initiator: true } });
				send(b, { type: 'peer-ready', data: { initiator: false } });
			}
			return;
		}

		if (!socket.roomId) return;

		if (type === 'leave') {
			leaveRoom(socket);
			return;
		}

		if (!relayTypes.has(type)) return;
		for (const peer of peersInRoom(socket.roomId)) if (peer !== socket) send(peer, { type, data });
	});

	socket.on('close', () => leaveRoom(socket));
});

console.log(`[signaling] Listening on ${HOST}:${PORT}`);
console.log(`[signaling] Local URL: ws://localhost:${PORT}`);

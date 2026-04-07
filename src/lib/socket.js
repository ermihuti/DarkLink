const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL;

export const createSignalingClient = ({ roomId, onMessage, onStatus }) => {
	let socket;

	const connect = () => {
		socket = new WebSocket(SIGNALING_URL);

		socket.addEventListener('open', () => {
			onStatus?.('connected');
			send('join', { roomId });
		});

		socket.addEventListener('close', () => {
			onStatus?.('disconnected');
		});

		socket.addEventListener('error', () => {
			onStatus?.('error');
		});

		socket.addEventListener('message', (event) => {
			try {
				const payload = JSON.parse(event.data);
				onMessage?.(payload);
			} catch {
				onStatus?.('invalid-message');
			}
		});
	};

	const send = (type, data = {}) => {
		if (!socket || socket.readyState !== WebSocket.OPEN) return;
		socket.send(JSON.stringify({ type, data }));
	};

	const disconnect = () => {
		send('leave');
		socket?.close();
	};

	return {
		connect,
		send,
		disconnect
	};
};

const turnUrl = import.meta.env.VITE_TURN_URL;
const defaultIceServers = [
	{ urls: 'stun:stun.l.google.com:19302' },
	...(turnUrl
		? [
				{
					urls: turnUrl,
					username: import.meta.env.VITE_TURN_USERNAME || '',
					credential: import.meta.env.VITE_TURN_CREDENTIAL || ''
				}
			]
		: [])
];

export const createWebRTCClient = ({
	onLocalStream,
	onRemoteStream,
	onIceCandidate,
	onConnectionState,
	iceServers = defaultIceServers
}) => {
	let localStream, outgoingStream, peerConnection;
	let pendingCandidates = [];
	const audio = { context: null, source: null, highpass: null, lowpass: null, gain: null };
	const video = { canvas: null, ctx: null, element: null, loopId: null };

	const stopTracks = (stream) => stream?.getTracks().forEach((t) => t.stop());
	const toggle = (tracks) => {
		tracks?.forEach((t) => (t.enabled = !t.enabled));
		return tracks?.[0]?.enabled ?? false;
	};

	const createProcessedVideoTrack = async (track) => {
		if (!track) return null;
		const s = track.getSettings();
		video.canvas = document.createElement('canvas');
		video.canvas.width = s.width || 1280;
		video.canvas.height = s.height || 720;
		video.ctx = video.canvas.getContext('2d');
		video.element = document.createElement('video');
		video.element.muted = true;
		video.element.playsInline = true;
		video.element.srcObject = new MediaStream([track]);
		await video.element.play();
		const draw = () => {
			if (!video.ctx || !video.element) return;
			video.ctx.drawImage(video.element, 0, 0, video.canvas.width, video.canvas.height);
			video.loopId = requestAnimationFrame(draw);
		};
		draw();
		return video.canvas.captureStream(s.frameRate || 30).getVideoTracks()[0] || null;
	};

	const createOutgoingStream = async () => {
		const [v] = localStream.getVideoTracks();
		const [a] = localStream.getAudioTracks();
		outgoingStream = new MediaStream(
			[(await createProcessedVideoTrack(v)) || v, createProcessedAudioTrack(a) || a].filter(Boolean)
		);
	};

	const flushPendingCandidates = async () => {
		if (!peerConnection?.remoteDescription) return;
		for (const c of pendingCandidates) await peerConnection.addIceCandidate(new RTCIceCandidate(c));
		pendingCandidates = [];
	};

	const ensurePeerConnection = () => {
		if (peerConnection) return peerConnection;
		peerConnection = new RTCPeerConnection({ iceServers });
		outgoingStream?.getTracks().forEach((t) => peerConnection.addTrack(t, outgoingStream));
		peerConnection.ontrack = (e) => onRemoteStream?.(e.streams[0]);
		peerConnection.onicecandidate = (e) => e.candidate && onIceCandidate?.(e.candidate);
		peerConnection.onconnectionstatechange = () =>
			onConnectionState?.(peerConnection.connectionState);
		return peerConnection;
	};

	const startLocalMedia = async () => {
		localStream = await navigator.mediaDevices.getUserMedia({
			video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
			audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
		});
		await createOutgoingStream();
		onLocalStream?.(localStream);
		return localStream;
	};

	const createOffer = async () => {
		const pc = ensurePeerConnection();
		const offer = await pc.createOffer();
		await pc.setLocalDescription(offer);
		return offer;
	};

	const handleOffer = async (offer) => {
		const pc = ensurePeerConnection();
		await pc.setRemoteDescription(new RTCSessionDescription(offer));
		await flushPendingCandidates();
		const answer = await pc.createAnswer();
		await pc.setLocalDescription(answer);
		return answer;
	};

	const handleAnswer = async (answer) => {
		if (!peerConnection) return;
		await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
		await flushPendingCandidates();
	};

	const handleIceCandidate = async (candidate) => {
		if (!peerConnection?.remoteDescription) return void pendingCandidates.push(candidate);
		await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
	};

	const resetPeer = () => {
		pendingCandidates = [];
		peerConnection?.close();
		peerConnection = null;
		onRemoteStream?.(null);
	};

	const stop = () => {
		resetPeer();
		stopTracks(localStream);
		stopTracks(outgoingStream);
		if (video.loopId) cancelAnimationFrame(video.loopId);
		if (video.element) {
			video.element.pause();
			video.element.srcObject = null;
		}
		audio.source?.disconnect();
		audio.highpass?.disconnect();
		audio.lowpass?.disconnect();
		audio.gain?.disconnect();
		audio.context?.close();
		video.canvas = null;
		video.ctx = null;
		video.element = null;
		video.loopId = null;
		audio.context = null;
		audio.source = null;
		audio.highpass = null;
		audio.lowpass = null;
		audio.gain = null;
		localStream = null;
		outgoingStream = null;
	};

	return {
		startLocalMedia,
		createOffer,
		handleOffer,
		handleAnswer,
		handleIceCandidate,
		toggleMute: () => toggle(localStream?.getAudioTracks()),
		toggleCamera: () => toggle(localStream?.getVideoTracks()),
		resetPeer,
		stop
	};
};

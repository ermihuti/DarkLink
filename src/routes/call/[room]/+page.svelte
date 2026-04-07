<script>
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { createSignalingClient } from '$lib/socket';
	import { createWebRTCClient } from '$lib/webrtc';

	let { data } = $props();

	let localVideo;
	let remoteVideo;
	let status = $state('Verbinde...');
	let muted = $state(false);
	let cameraOff = $state(false);
	let remoteMuted = $state(false);
	let remoteCameraOff = $state(false);
	let videoFilter = $state('none');
	let audioFilter = $state('normal');

	let signaling;
	let rtc;
	const VIDEO_FILTERS = {
		none: undefined,
		grayscale: 'grayscale(1)',
		sepia: 'sepia(0.85)',
		cinema: 'contrast(1.3) saturate(1.2)'
	};
	const RED_ICON_FILTER =
		'brightness(0) saturate(100%) invert(38%) sepia(72%) saturate(1534%) hue-rotate(343deg)';
	const GREEN_ICON_FILTER =
		'brightness(0) saturate(100%) invert(75%) sepia(64%) saturate(1350%) hue-rotate(88deg)';

	const iconFilter = (isOff) => (isOff ? RED_ICON_FILTER : GREEN_ICON_FILTER);

	const setRemoteStream = (stream) => remoteVideo && (remoteVideo.srcObject = stream);

	const sendCurrentMediaState = () =>
		signaling?.send('media-state', { audioEnabled: !muted, videoEnabled: !cameraOff });

	const toggleMute = () => {
		muted = !rtc.toggleMute();
		sendCurrentMediaState();
	};

	const toggleCamera = () => {
		cameraOff = !rtc.toggleCamera();
		sendCurrentMediaState();
	};

	const leaveCall = async () => {
		signaling?.disconnect();
		rtc?.stop();
		await goto(resolve('/'));
	};

	onMount(async () => {
		rtc = createWebRTCClient({
			onLocalStream: (stream) => localVideo && (localVideo.srcObject = stream),
			onRemoteStream: setRemoteStream,
			onIceCandidate: (candidate) => signaling?.send('ice-candidate', { candidate }),
			onConnectionState: (state) => {
				if (state === 'connected') {
					status = 'Verbunden';
					sendCurrentMediaState();
				}
			}
		});

		await rtc.startLocalMedia();
		rtc.setVideoFilter(videoFilter);
		rtc.setAudioFilter(audioFilter);

		signaling = createSignalingClient({
			roomId: data.room,
			onMessage: async ({ type, data: signalData = {} }) => {
				if (type === 'peer-ready' && signalData.initiator) {
					signaling.send('offer', { offer: await rtc.createOffer() });
				}
				if (type === 'offer')
					signaling.send('answer', { answer: await rtc.handleOffer(signalData.offer) });
				if (type === 'answer') await rtc.handleAnswer(signalData.answer);
				if (type === 'ice-candidate') await rtc.handleIceCandidate(signalData.candidate);
				if (type === 'peer-left') rtc?.resetPeer();
				if (type === 'media-state') {
					if ('audioEnabled' in signalData) remoteMuted = !signalData.audioEnabled;
					if ('videoEnabled' in signalData) remoteCameraOff = !signalData.videoEnabled;
				}
			},
			onStatus: (socketStatus) => socketStatus === 'disconnected' && (status = 'Signaling getrennt')
		});

		signaling.connect();
	});

	onDestroy(() => {
		signaling?.disconnect();
		rtc?.stop();
	});
</script>

<svelte:head>
	<title>DarkLink Call | {data.room}</title>
</svelte:head>

<main
	class="min-h-screen bg-[linear-gradient(160deg,#020617,#0f172a_55%,#1e293b),radial-gradient(circle_at_top_right,#67e8f944,transparent_40%)] px-4 py-4 text-slate-200 sm:px-8 sm:py-8"
>
	<header class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<p class="m-0 text-xs tracking-[0.14em] text-sky-300 uppercase">Raum</p>
			<h1 class="m-0 text-3xl font-semibold sm:text-4xl">{data.room}</h1>
		</div>
		<p class="m-0 rounded-full border border-slate-700 bg-slate-900/75 px-3 py-2 text-sm">
			{status}
		</p>
	</header>

	<section class="mt-4 grid gap-4 md:grid-cols-2">
		<article
			class="group relative grid gap-2 rounded-2xl border border-slate-700 bg-slate-900/70 p-3"
		>
			<div class="flex items-center justify-between gap-2">
				<p class="m-0 font-semibold text-sky-200">Du</p>
				<div class="flex gap-1">
					<div
						class="flex items-center justify-center rounded-full bg-black/60 p-1 backdrop-blur"
						title={muted ? 'Mikrofon aus' : 'Mikrofon an'}
					>
						<img
							src={muted ? '/mute.svg' : '/unmute.svg'}
							alt={muted ? 'Mikrofon aus' : 'Mikrofon an'}
							class="h-4 w-4"
							style={`filter: ${iconFilter(muted)}`}
						/>
					</div>
					<div
						class="flex items-center justify-center rounded-full bg-black/60 p-1 backdrop-blur"
						title={cameraOff ? 'Kamera aus' : 'Kamera an'}
					>
						<img
							src={cameraOff ? '/c_off.svg' : '/c_on.svg'}
							alt={cameraOff ? 'Kamera aus' : 'Kamera an'}
							class="h-4 w-4"
							style={`filter: ${iconFilter(cameraOff)}`}
						/>
					</div>
				</div>
			</div>
			<div class="relative">
				<video
					bind:this={localVideo}
					autoplay
					muted
					playsinline
					style:filter={VIDEO_FILTERS[videoFilter]}
					class="aspect-video w-full rounded-xl bg-slate-950 object-cover"
				></video>
			</div>
		</article>
		<article
			class="group relative grid gap-2 rounded-2xl border border-slate-700 bg-slate-900/70 p-3"
		>
			<div class="flex items-center justify-between gap-2">
				<p class="m-0 font-semibold text-sky-200">Gegenstelle</p>
				<div class="flex gap-1">
					<div
						class="flex items-center justify-center rounded-full bg-black/60 p-1 backdrop-blur"
						title={remoteMuted ? 'Mikrofon aus' : 'Mikrofon an'}
					>
						<img
							src={remoteMuted ? '/mute.svg' : '/unmute.svg'}
							alt={remoteMuted ? 'Mikrofon aus' : 'Mikrofon an'}
							class="h-4 w-4"
							style={`filter: ${iconFilter(remoteMuted)}`}
						/>
					</div>
					<div
						class="flex items-center justify-center rounded-full bg-black/60 p-1 backdrop-blur"
						title={remoteCameraOff ? 'Kamera aus' : 'Kamera an'}
					>
						<img
							src={remoteCameraOff ? '/c_off.svg' : '/c_on.svg'}
							alt={remoteCameraOff ? 'Kamera aus' : 'Kamera an'}
							class="h-4 w-4"
							style={`filter: ${iconFilter(remoteCameraOff)}`}
						/>
					</div>
				</div>
			</div>
			<div class="relative">
				<video
					bind:this={remoteVideo}
					autoplay
					playsinline
					class="aspect-video w-full rounded-xl bg-slate-950 object-cover"
				></video>
			</div>
		</article>
	</section>

	<section class="mt-4 flex flex-wrap items-end gap-3">
		<button
			class="cursor-pointer rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-semibold text-slate-100"
			onclick={toggleMute}
		>
			{muted ? 'Unmute' : 'Mute'}
		</button>
		<button
			class="cursor-pointer rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-semibold text-slate-100"
			onclick={toggleCamera}
		>
			{cameraOff ? 'Kamera an' : 'Kamera aus'}</button
		>

		<label class="grid gap-1 text-sm">
			Videofilter
			<select
				bind:value={videoFilter}
				onchange={() => rtc.setVideoFilter(videoFilter)}
				class="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-semibold text-slate-100"
			>
				<option value="none">Kein Filter</option>
				<option value="grayscale">Graustufen</option>
				<option value="sepia">Sepia</option>
				<option value="cinema">Cinema</option>
			</select>
		</label>

		<label class="grid gap-1 text-sm">
			Audiofilter
			<select
				bind:value={audioFilter}
				onchange={() => rtc.setAudioFilter(audioFilter)}
				class="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 font-semibold text-slate-100"
			>
				<option value="normal">Normal</option>
				<option value="boost">Boost</option>
				<option value="quiet">Quiet</option>
				<option value="radio">Radio</option>
			</select>
		</label>

		<button
			type="button"
			onclick={leaveCall}
			class="rounded-xl bg-linear-to-r from-rose-500 to-rose-400 px-4 py-3 font-semibold text-white"
		>
			Call beenden
		</button>
	</section>
</main>

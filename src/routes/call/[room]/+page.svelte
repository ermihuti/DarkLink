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

	let signaling;
	let rtc;

	const setRemoteStream = (stream) => remoteVideo && (remoteVideo.srcObject = stream);

	const sendCurrentMediaState = () =>
		signaling?.send('media-state', { audioEnabled: !muted, videoEnabled: !cameraOff });

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
			</div>
			<div class="relative">
				<video
					bind:this={localVideo}
					autoplay
					muted
					playsinline
					class="aspect-video w-full rounded-xl bg-slate-950 object-cover"
				></video>
			</div>
		</article>
		<article
			class="group relative grid gap-2 rounded-2xl border border-slate-700 bg-slate-900/70 p-3"
		>
			<div class="flex items-center justify-between gap-2">
				<p class="m-0 font-semibold text-sky-200">Gegenstelle</p>
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

		<button
			type="button"
			onclick={leaveCall}
			class="rounded-xl bg-linear-to-r from-rose-500 to-rose-400 px-4 py-3 font-semibold text-white"
		>
			Call beenden
		</button>
</main>

<script>
	let roomId = $state('');

	const quickJoin = () => {
		roomId = roomId.trim();
		if (!roomId) return;
		window.location.href = `/call/${encodeURIComponent(roomId)}`;
	};
</script>

<svelte:head>
	<title>DarkLink | 1:1 Videotelefonie</title>
	<meta
		name="description"
		content="DarkLink: Eine einfache 1-zu-1 Videotelefonie-Demo mit SvelteKit, WebRTC und WebSocket-Signaling."
	/>
</svelte:head>

<main
	class="min-h-screen bg-[#020617] bg-[radial-gradient(circle_at_15%_20%,#1d4ed822_0,#0f172a_36%),radial-gradient(circle_at_85%_65%,#05966933_0,#020617_40%)] px-8 py-8 text-slate-200"
>
	<div class="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl content-center gap-8 md:grid-cols-2">
		<section>
			<p class="text-xs font-bold tracking-[0.18em] text-sky-300 uppercase">DarkLink</p>
			<h1 class="my-2 text-4xl leading-tight font-semibold md:text-6xl">
				1:1 Videotelefonie mit WebRTC
			</h1>
			<p class="max-w-[50ch] leading-relaxed text-slate-300">
				Erstelle einen Raum, teile den Link und starte einen direkten Videoanruf inklusive Mute,
				Kamera-Toggle und Audio/Video-Filtern.
			</p>
		</section>

		<section
			class="grid content-start gap-4 rounded-2xl border border-slate-700 bg-slate-900/70 p-6 backdrop-blur"
		>
			<label for="room" class="text-sm font-medium text-slate-300">Raum-ID</label>
			<input
				id="room"
				type="text"
				bind:value={roomId}
				placeholder="z.B. itp-demo-01"
				onkeydown={(event) => event.key === 'Enter' && quickJoin()}
				class="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 ring-sky-400 transition outline-none focus:ring-2"
			/>
			<button
				onclick={quickJoin}
				class="cursor-pointer rounded-xl bg-linear-to-r from-sky-400 to-cyan-300 px-4 py-3 font-bold text-sky-950"
			>
				Zum Call
			</button>
			<p class="m-0 text-sm text-slate-400">Maximal 2 Teilnehmende pro Raum.</p>
		</section>
	</div>
</main>

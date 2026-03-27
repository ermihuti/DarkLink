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
	</div>
</main>

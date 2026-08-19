<script lang="ts">
	import { surveyStore } from '$lib/surveyStore.svelte';
	import { diffSurvey, type QuestionDiff } from '$lib/diff';

	const entries = $derived.by(() => {
		// Referenciar `survey` acá adentro es lo que hace que esto se recalcule
		// cada vez que llega un cambio (local o remoto).
		void surveyStore.survey;
		return surveyStore.history();
	});

	let expanded = $state<Set<string>>(new Set());
	let confirmingIndex = $state<number | null>(null);

	function toggle(hash: string) {
		const next = new Set(expanded);
		if (next.has(hash)) next.delete(hash);
		else next.add(hash);
		expanded = next;
	}

	function diffsFor(index: number): QuestionDiff[] {
		const { before, after } = surveyStore.snapshotsAt(entries, index);
		return diffSurvey(before, after);
	}

	function confirmRestore() {
		if (confirmingIndex === null) return;
		const { after } = surveyStore.snapshotsAt(entries, confirmingIndex);
		surveyStore.restoreSections(after.sections);
		confirmingIndex = null;
	}

	const confirmingEntry = $derived(confirmingIndex === null ? undefined : entries[confirmingIndex]);

	function actorColor(actor: string): string {
		let hash = 0;
		for (let i = 0; i < actor.length; i++) hash = (hash * 31 + actor.charCodeAt(i)) >>> 0;
		return `hsl(${hash % 360}, 55%, 45%)`;
	}

	function formatTime(ms: number): string {
		return new Date(ms).toLocaleTimeString('es-AR', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}
</script>

<div class="history">


	{#if entries.length === 0}
		<p class="empty">Todavía no hay cambios.</p>
	{:else}
		<ol class="log">
			{#each entries as entry, index (entry.hash)}
				<li class="entry">
					<button class="entry-header" onclick={() => toggle(entry.hash)}>
						<span class="actor-dot" style:background={actorColor(entry.actor)}></span>
						<span class="hash">{entry.hash.slice(0, 7)}</span>
						<span class="time">{formatTime(entry.time)}</span>
						<span class="actor" style:color={actorColor(entry.actor)}>
							{entry.actor.slice(0, 6)}
						</span>
						<span class="ops-count">{entry.ops.length} ops</span>
						<span class="chevron" class:open={expanded.has(entry.hash)}>▸</span>
					</button>

					{#if expanded.has(entry.hash)}
						{@const diffs = diffsFor(index)}
						<div class="diff">
							<button class="restore" onclick={() => (confirmingIndex = index)}>
								↺ Restaurar esta versión
							</button>
							{#if diffs.length === 0}
								<p class="no-diff">Sin cambios visibles en las preguntas (ops internas).</p>
							{:else}
								{#each diffs as d (d.questionId)}
									<div class="question-diff">
										<div class="question-diff-header">
											<span class="section-title">{d.sectionTitle}</span>
											<span class="kind kind-{d.kind}">
												{d.kind === 'added' ? '+ agregada' : d.kind === 'removed' ? '− eliminada' : '~ editada'}
											</span>
										</div>
										<p class="text-diff">
											{#each d.textTokens as t, i (i)}
												<span class="tok tok-{t.type}">{t.text}</span>
											{/each}
										</p>
										{#if d.optionDiffs}
											<ul class="option-diffs">
												{#each d.optionDiffs as o, i (i)}
													<li class="option-diff option-diff-{o.kind}">
														{#each o.tokens as t, ti (ti)}
															<span class="tok tok-{t.type}">{t.text}</span>
														{/each}
													</li>
												{/each}
											</ul>
										{/if}
									</div>
								{/each}
							{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ol>
	{/if}
</div>

{#if confirmingEntry}
	<div
		class="overlay"
		role="presentation"
		onclick={() => (confirmingIndex = null)}
		onkeydown={(e) => e.key === 'Escape' && (confirmingIndex = null)}
	>
		<div
			class="dialog"
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<h3>¿Restaurar esta versión?</h3>
			<p>
				La encuesta va a volver a como estaba en el commit
				<span class="dialog-hash">{confirmingEntry.hash.slice(0, 7)}</span>
				({formatTime(confirmingEntry.time)}). No se borra nada del historial — se agrega un cambio
				nuevo que restaura ese contenido, así que siempre podés volver atrás de nuevo.
			</p>
			<div class="dialog-actions">
				<button class="cancel" onclick={() => (confirmingIndex = null)}>Cancelar</button>
				<button class="confirm" onclick={confirmRestore}>Restaurar</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.hint {
		font-size: 0.85rem;
		color: #888;
		margin-bottom: 1.5rem;
	}

	.log {
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.entry-header {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		background: none;
		border: none;
		border-bottom: 1px solid #eee;
		padding: 0.5rem 0;
		cursor: pointer;
		font: inherit;
		text-align: left;
	}

	.actor-dot {
		width: 0.6rem;
		height: 0.6rem;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.hash {
		font-family: ui-monospace, monospace;
		color: #999;
		font-size: 0.8rem;
	}

	.time {
		color: #666;
		font-size: 0.8rem;
	}

	.actor {
		font-family: ui-monospace, monospace;
		font-weight: 600;
		font-size: 0.8rem;
	}

	.ops-count {
		font-size: 0.75rem;
		color: #aaa;
		margin-left: auto;
	}

	.chevron {
		font-size: 0.75rem;
		color: #999;
		transition: transform 0.15s;
	}

	.chevron.open {
		transform: rotate(90deg);
	}

	.diff {
		padding: 0.75rem 0 1rem 1.25rem;
		border-left: 2px solid #eee;
		margin-left: 0.3rem;
	}

	.no-diff {
		color: #888;
		font-style: italic;
		font-size: 0.85rem;
	}

	.question-diff {
		margin-bottom: 1rem;
	}

	.question-diff-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.3rem;
	}

	.section-title {
		font-size: 0.75rem;
		color: #888;
	}

	.kind {
		font-size: 0.7rem;
		font-weight: 600;
		border-radius: 4px;
		padding: 0.05rem 0.4rem;
	}

	.kind-added {
		color: #1a7f37;
		background: #ddf4e0;
	}

	.kind-removed {
		color: #b91c1c;
		background: #fde2e2;
	}

	.kind-modified {
		color: #915907;
		background: #fef3c7;
	}

	.text-diff {
		font-size: 0.9rem;
		line-height: 1.6;
		margin: 0.3rem 0;
	}

	.option-diffs {
		list-style: none;
		padding: 0;
		margin-top: 0.3rem;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.option-diff {
		font-size: 0.85rem;
		padding-left: 1rem;
	}

	.option-diff::before {
		content: '○ ';
		color: #ccc;
	}

	.tok {
		white-space: pre-wrap;
	}

	.tok-same {
		color: #444;
	}

	.tok-add {
		background: #ddf4e0;
		color: #1a7f37;
		text-decoration: none;
	}

	.tok-del {
		background: #fde2e2;
		color: #b91c1c;
		text-decoration: line-through;
	}

	.empty {
		color: #888;
		font-style: italic;
	}

	.restore {
		display: block;
		margin-bottom: 0.75rem;
		border: 1px solid #ccc;
		background: #fafafa;
		border-radius: 6px;
		padding: 0.3rem 0.65rem;
		font-size: 0.8rem;
		cursor: pointer;
	}

	.restore:hover {
		background: #f0f0f0;
	}

	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		z-index: 10;
	}

	.dialog {
		background: #fff;
		border-radius: 10px;
		padding: 1.5rem;
		max-width: 420px;
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
	}

	.dialog h3 {
		margin: 0 0 0.6rem;
		font-size: 1.05rem;
	}

	.dialog p {
		font-size: 0.9rem;
		color: #444;
		line-height: 1.5;
		margin: 0 0 1.25rem;
	}

	.dialog-hash {
		font-family: ui-monospace, monospace;
		background: #f2f2f2;
		border-radius: 4px;
		padding: 0.05rem 0.35rem;
	}

	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.6rem;
	}

	.dialog-actions button {
		border-radius: 6px;
		padding: 0.45rem 0.9rem;
		font-size: 0.85rem;
		cursor: pointer;
		border: 1px solid #ccc;
	}

	.cancel {
		background: #fff;
	}

	.confirm {
		background: #111;
		color: #fff;
		border-color: #111;
	}
</style>

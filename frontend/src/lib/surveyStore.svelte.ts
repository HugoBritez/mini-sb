import { Repo, isValidAutomergeUrl, type DocHandle, type UrlHeads } from '@automerge/automerge-repo';
import { WebSocketClientAdapter as BrowserWebSocketClientAdapter } from '@automerge/automerge-repo-network-websocket';
import type { Question, QuestionType, Section, Survey } from './types';

// wss:// en producción (apuntando al server de Railway), ws:// en dev local.
// Se deriva la URL http(s) del mismo valor para no repetir la config.
const WS_URL: string = import.meta.env.VITE_SYNC_SERVER_URL ?? 'ws://localhost:3030';
const HTTP_URL = WS_URL.replace(/^ws/, 'http');

// Cuánto esperar como máximo a que el peer real (el sync server) se conecte
// antes de intentar buscar el doc igual. `BrowserWebSocketClientAdapter`
// tiene un timeout interno de 1000ms que lo fuerza a "ready" si el handshake
// real todavía no terminó (en localhost nunca importa, en una red real con
// latencia sí) — repo.find() puede ver "listo pero sin peer" y devolver
// "unavailable" antes de que el peer llegue unos milisegundos después. Acá
// esperamos el evento 'peer' real en vez de confiar en ese ready forzado.
const PEER_WAIT_TIMEOUT_MS = 8000;

function waitForPeer(repo: Repo, timeoutMs: number): Promise<void> {
	if (repo.peers.length > 0) return Promise.resolve();
	return new Promise((resolve) => {
		const timer = setTimeout(() => {
			repo.networkSubsystem.off('peer', onPeer);
			resolve();
		}, timeoutMs);
		function onPeer() {
			clearTimeout(timer);
			repo.networkSubsystem.off('peer', onPeer);
			resolve();
		}
		repo.networkSubsystem.on('peer', onPeer);
	});
}

// cuanto esperamos antes de dar por perdido el lock de alguien que no manda
// heartbeat (si alguien  cerró la pestaña sin soltar el foco).
const LOCK_TTL_MS = 6000;
const HEARTBEAT_MS = 2500;
const SWEEP_INTERVAL_MS = 1500;
// Retraso al perder el foco antes de soltar el lock: evita que tabular entre
// dos campos de la misma pregunta lo suelte y lo vuelva a tomar de inmediato.
const UNLOCK_DELAY_MS = 150;

interface Peer {
	id: string;
	name: string;
	color: string;
}

interface LockInfo extends Peer {
	lastSeen: number;
}

type EphemeralMessage =
	| { type: 'lock'; questionId: string; peer: Peer }
	| { type: 'unlock'; questionId: string; peer: Peer };

export interface ChangeLogEntry {
	hash: string;
	/** heads justo después de este cambio; sirve para pedirle a Automerge un snapshot en ese punto. */
	heads: UrlHeads;
	/** epoch ms */
	time: number;
	/** actor id interno de Automerge, no es el peer.id nuestro */
	actor: string;
	ops: { action: string; key: string }[];
}

const PEER_NAMES = ['Francesco Cannata', 'Guido', 'Sofi', 'Diego', 'Pablo', 'Fabri', 'Martin Burt', 'Julia Corvalan'];
const PEER_COLORS = [
	'#e74c3c',
	'#3498db',
	'#2ecc71',
	'#f39c12',
	'#9b59b6',
	'#1abc9c',
	'#e67e22',
	'#34495e'
];

function randomPeer(): Peer {
	return {
		id: crypto.randomUUID(),
		name: PEER_NAMES[Math.floor(Math.random() * PEER_NAMES.length)],
		color: PEER_COLORS[Math.floor(Math.random() * PEER_COLORS.length)]
	};
}

function emptySurvey(): Survey {
	return { title: '', sections: [] };
}

class SurveyStore {
	survey = $state<Survey>(emptySurvey());
	status = $state<'connecting' | 'ready' | 'error'>('connecting');
	locks = $state<Record<string, LockInfo>>({});

	readonly peer = randomPeer();

	#handle: DocHandle<Survey> | undefined;
	#activeLockId: string | undefined;
	#heartbeatTimer: ReturnType<typeof setInterval> | undefined;
	#unlockTimer: ReturnType<typeof setTimeout> | undefined;

	async connect() {
		try {
			const res = await fetch(`${HTTP_URL}/doc-url`);
			const { url } = (await res.json()) as { url: string };

			if (!isValidAutomergeUrl(url)) {
				throw new Error(`URL de documento inválida: ${url}`);
			}

			const repo = new Repo({
				network: [new BrowserWebSocketClientAdapter(WS_URL)]
			});

			await waitForPeer(repo, PEER_WAIT_TIMEOUT_MS);

			const handle = await repo.find<Survey>(url);
			this.#handle = handle;
			this.survey = handle.doc() ?? emptySurvey();
			this.status = 'ready';

			handle.on('change', ({ doc }) => {
				if (doc) this.survey = doc;
			});

			handle.on('ephemeral-message', ({ message }) => {
				const msg = message as EphemeralMessage;
				if (msg.type === 'lock') {
					this.locks[msg.questionId] = { ...msg.peer, lastSeen: Date.now() };
				} else if (msg.type === 'unlock') {
					if (this.locks[msg.questionId]?.id === msg.peer.id) {
						delete this.locks[msg.questionId];
					}
				}
			});

			setInterval(() => this.#sweepExpiredLocks(), SWEEP_INTERVAL_MS);
			window.addEventListener('beforeunload', () => this.unlockQuestion());
		} catch (err) {
			console.error('No se pudo conectar al sync server', err);
			this.status = 'error';
		}
	}

	#sweepExpiredLocks() {
		const now = Date.now();
		for (const [questionId, lock] of Object.entries(this.locks)) {
			if (now - lock.lastSeen > LOCK_TTL_MS) {
				delete this.locks[questionId];
			}
		}
	}

	#broadcastLock(questionId: string) {
		this.#handle?.broadcast({ type: 'lock', questionId, peer: this.peer } satisfies EphemeralMessage);
	}

	/** Toma el lock de una pregunta para este peer (idempotente, cancela un unlock pendiente). */
	lockQuestion(questionId: string) {
		clearTimeout(this.#unlockTimer);
		if (this.#activeLockId === questionId) return;
		this.unlockQuestion();

		this.#activeLockId = questionId;
		this.#broadcastLock(questionId);
		this.#heartbeatTimer = setInterval(() => this.#broadcastLock(questionId), HEARTBEAT_MS);
	}

	/** Suelta el lock activo, con un pequeño retraso para tolerar cambio de foco dentro de la misma pregunta. */
	scheduleUnlock(questionId: string) {
		clearTimeout(this.#unlockTimer);
		this.#unlockTimer = setTimeout(() => {
			if (this.#activeLockId === questionId) this.unlockQuestion();
		}, UNLOCK_DELAY_MS);
	}

	unlockQuestion() {
		if (!this.#activeLockId) return;
		const questionId = this.#activeLockId;
		clearInterval(this.#heartbeatTimer);
		this.#activeLockId = undefined;
		this.#handle?.broadcast({ type: 'unlock', questionId, peer: this.peer } satisfies EphemeralMessage);
	}

	isLockedByOther(questionId: string): boolean {
		const lock = this.locks[questionId];
		return !!lock && lock.id !== this.peer.id;
	}

	lockHolder(questionId: string): LockInfo | undefined {
		return this.locks[questionId];
	}

	/** Log crudo de cambios del documento (como `git log`), más reciente primero. */
	history(): ChangeLogEntry[] {
		if (!this.#handle) return [];
		return this.#handle
			.history()
			.map((heads): ChangeLogEntry | undefined => {
				const hash = heads[0];
				const meta = this.#handle!.metadata(hash);
				if (!meta) return undefined;
				return {
					hash: meta.hash,
					heads,
					time: meta.time * 1000,
					actor: meta.actor,
					ops: meta.ops.map((op) => ({ action: op.action, key: op.key }))
				};
			})
			.filter((entry): entry is ChangeLogEntry => !!entry)
			.reverse();
	}

	/**
	 * Snapshots del documento justo antes y justo después de una entrada del
	 * historial (`entries` viene de `history()`, ya en orden más-reciente-primero).
	 */
	snapshotsAt(entries: ChangeLogEntry[], index: number): { before: Survey; after: Survey } {
		const empty = emptySurvey();
		if (!this.#handle) return { before: empty, after: empty };

		const entry = entries[index];
		if (!entry) return { before: empty, after: empty };

		// El elemento siguiente en la lista (más reciente-primero) es, en el
		// tiempo, el cambio anterior a este. El último de todos no tiene "antes".
		const beforeHeads = entries[index + 1]?.heads ?? ([] as unknown as UrlHeads);

		const before = this.#handle.view(beforeHeads).doc() ?? empty;
		const after = this.#handle.view(entry.heads).doc() ?? empty;
		return { before, after };
	}

	/**
	 * Restaura el contenido de una versión pasada del historial. No borra nada:
	 * escribe un cambio nuevo que deja las secciones como estaban en ese punto
	 * (equivalente a `git revert`, no a `git reset --hard`) — el historial real
	 * sigue completo.
	 */
	restoreSections(sections: Section[]) {
		// JSON round-trip: `sections` viene de un DocHandle.view() de solo lectura
		// (otro snapshot de Automerge); lo convertimos a JSON plano antes de
		// escribirlo para no arrastrar identidad interna de ese otro snapshot.
		const plain = JSON.parse(JSON.stringify(sections)) as Section[];
		this.#handle?.change((doc) => {
			doc.sections.splice(0, doc.sections.length, ...plain);
		});
	}

	section(sectionId: string): Section | undefined {
		return this.survey.sections.find((s) => s.id === sectionId);
	}

	addQuestion(sectionId: string, type: QuestionType) {
		this.#handle?.change((doc) => {
			const section = doc.sections.find((s) => s.id === sectionId);
			if (!section) return;

			const question: Question = {
				id: crypto.randomUUID(),
				type,
				text: ''
			};
			if (type === 'single_choice' || type === 'multi_choice') {
				question.options = ['Opción 1'];
			}
			if (type === 'rating') {
				question.scale = { min: 1, max: 5 };
			}
			section.questions.push(question);
		});
	}

	/**
	 * Único punto de escritura para el contenido de una pregunta (texto +
	 * opciones). Se llama una sola vez al tocar "Guardar" — así cada commit de
	 * Automerge representa una edición completa e intencional, no una tecla.
	 */
	saveQuestion(sectionId: string, questionId: string, patch: { text: string; options?: string[] }) {
		this.#handle?.change((doc) => {
			const question = doc.sections
				.find((s) => s.id === sectionId)
				?.questions.find((q) => q.id === questionId);
			if (!question) return;

			question.text = patch.text;
			if (patch.options && question.options) {
				// splice en el array existente (en vez de reasignarlo) para que
				// Automerge pueda mergear a nivel de elemento, no reemplazar el
				// array entero como un blob.
				question.options.splice(0, question.options.length, ...patch.options);
			}
		});
	}

	removeQuestion(sectionId: string, questionId: string) {
		this.#handle?.change((doc) => {
			const questions = doc.sections.find((s) => s.id === sectionId)?.questions;
			const index = questions?.findIndex((q) => q.id === questionId) ?? -1;
			if (index !== -1) questions!.splice(index, 1);
		});
	}

	updateScale(sectionId: string, questionId: string, scale: { min: number; max: number }) {
		this.#handle?.change((doc) => {
			const question = doc.sections
				.find((s) => s.id === sectionId)
				?.questions.find((q) => q.id === questionId);
			if (question) question.scale = scale;
		});
	}
}

export const surveyStore = new SurveyStore();

# mini-sb

Mini Survey Builder — un MVP para demostrar edición colaborativa en tiempo real con [Automerge](https://automerge.org/) (CRDT), sin conflictos, en un builder de encuestas.

La idea nace de una pregunta simple: **git resuelve merges sin un servidor central que arbitre — ¿se puede llevar esa misma idea a una app colaborativa en tiempo real?** Automerge es justamente eso: la misma filosofía de git (cambios con causalidad, no snapshots), pero resolviendo automáticamente en vez de pedirte que resuelvas un conflicto a mano.

## Qué muestra

- **Edición colaborativa en tiempo real** — dos pestañas/navegadores editando la misma encuesta, sincronizados vía WebSocket, sin pisarse.
- **Locks por pregunta** — si alguien está editando una pregunta, se bloquea (con nombre y color) para el resto, vía mensajería efímera (no se persiste en el CRDT).
- **Secciones navegables por URL** (`/survey/demo/seccion-1`, `/survey/demo/seccion-2`).
- **Preview** — cómo vería la encuesta quien la responde.
- **JSON** — el documento tal cual quedaría para mandar a un backend real.
- **Historial** — log de cambios estilo `git log`, con diff rojo/verde por pregunta y botón para restaurar una versión anterior (sin perder historial — es un revert, no un reset).

## Stack

- **Server** (`server/`): [Bun](https://bun.com) + `@automerge/automerge-repo` como sync server (WebSocket relay + doc canónico en memoria).
- **Frontend** (`frontend/`): SvelteKit 5 (runes) + `@automerge/automerge-repo` en el navegador.

## Cómo correrlo

Necesitás dos terminales:

```bash
# terminal 1 — sync server (ws://localhost:3030)
cd server
bun install
bun run dev
```

```bash
# terminal 2 — frontend (http://localhost:5173)
cd frontend
bun install
bun run dev
```

Abrí `http://localhost:5173` en dos pestañas (o dos navegadores) y editá la misma encuesta desde las dos para ver la sincronización en vivo.

> Es un MVP: el documento vive en memoria del server (se resetea al reiniciarlo), no hay auth, y hay una sola encuesta demo fija.

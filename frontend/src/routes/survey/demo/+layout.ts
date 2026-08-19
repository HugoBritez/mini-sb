// Automerge/automerge-repo cargan WASM pensado para el navegador (fetch-based).
// Todo lo que cuelga de /survey/demo es 100% interactivo (WebSocket + doc en
// tiempo real), así que no tiene sentido pre-renderizarlo en el server — y
// hacerlo rompe la carga del wasm.
export const ssr = false;

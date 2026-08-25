import http from "node:http";
import { WebSocketServer } from "ws";
import { Repo } from "@automerge/automerge-repo";
import { NodeWSServerAdapter } from "@automerge/automerge-repo-network-websocket";
import type { Survey } from "./types";

// Railway (y la mayoría de PaaS) inyectan PORT en runtime; 3030 queda de fallback para local.
const PORT = Number(process.env.PORT) || 3030;

const httpServer = http.createServer();
// perMessageDeflate apagado: algunos proxies (el borde de Railway incluido)
// manejan mal la negociación de compresión de WebSocket, y los mensajes
// binarios de Automerge (CBOR) llegan corruptos o se pierden en silencio.
const wss = new WebSocketServer({ server: httpServer, perMessageDeflate: false });

const repo = new Repo({
  network: [new NodeWSServerAdapter(wss)],
});

// Demo: un único documento fijo, creado al arrancar el server, con dos
// secciones ya seedeadas. Los ids son fijos (no hay concurrencia en este
// seed único) y duplican de slug para las rutas /survey/demo/[section].
const surveyHandle = repo.create<Survey>({
  title: "Encuesta de prueba",
  sections: [
    { id: "seccion-1", title: "Sección 1", questions: [] },
    { id: "seccion-2", title: "Sección 2", questions: [] },
  ],
});

httpServer.on("request", (req, res) => {
  if (req.method === "GET" && req.url === "/doc-url") {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({ url: surveyHandle.url }));
    return;
  }
  if (req.method === "GET" && (req.url === "/" || req.url === "/health")) {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("mini-sb sync server: ok");
    return;
  }
  res.writeHead(404);
  res.end();
});

httpServer.listen(PORT, () => {
  console.log(`Sync server escuchando en ws://localhost:${PORT}`);
  console.log(`Survey doc: ${surveyHandle.url}`);
});

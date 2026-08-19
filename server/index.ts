import http from "node:http";
import { WebSocketServer } from "ws";
import { Repo } from "@automerge/automerge-repo";
import { NodeWSServerAdapter } from "@automerge/automerge-repo-network-websocket";
import type { Survey } from "./types";

const PORT = 3030;

const httpServer = http.createServer();
const wss = new WebSocketServer({ server: httpServer });

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
  res.writeHead(404);
  res.end();
});

httpServer.listen(PORT, () => {
  console.log(`Sync server escuchando en ws://localhost:${PORT}`);
  console.log(`Survey doc: ${surveyHandle.url}`);
});

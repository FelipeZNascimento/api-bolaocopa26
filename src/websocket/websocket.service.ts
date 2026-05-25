import { Server } from "http";
import { AddressInfo } from "net";
import { WebSocket, WebSocketServer } from "ws";

import { logger } from "#logger/logger.service.js";
import { singleton } from "#utils/singleton.js";

export interface WebSocketMessage {
  data: unknown;
  type: "connection" | "error" | "ping" | "pong";
}

@singleton
export class WebSocketService {
  private static instance: WebSocketService;
  private wss!: WebSocketServer;

  public static getInstance(server?: Server): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }

    if (server) {
      WebSocketService.instance.initialize(server);
    }
    return WebSocketService.instance;
  }

  public broadcast(message: string) {
    const openClients = [...this.wss.clients].filter((c) => c.readyState === WebSocket.OPEN);
    logger.info(`Broadcasting "${message}" to ${openClients.length} open client(s)`);
    openClients.forEach((client) => client.send(message));
  }

  private initialize(server: Server): void {
    this.wss = new WebSocketServer({ server });
    const { port } = server.address() as AddressInfo;
    logger.info({ port }, "WebSocket server initialized");

    this.wss.on("connection", (ws: WebSocket) => {
      logger.info("WebSocket connection established");
      // this.metricsService.recordWebsocketConnection(true);

      ws.on("close", () => {
        logger.info("WebSocket connection closed");
        // this.metricsService.recordWebsocketConnection(false);
      });

      ws.on("message", (message: string) => {
        logger.debug({ message }, "WebSocket message received");
        // this.metricsService.recordWebsocketMessage("message", "in");
      });

      ws.on("broadcast", (message: string) => {
        logger.debug({ message }, "WebSocket broadcasting message");
        // this.metricsService.recordWebsocketMessage("message", "in");
      });
    });
  }

  // Rest of the WebSocket service implementation...
}

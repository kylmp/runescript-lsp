import { createConnection, TextDocuments, ProposedFeatures, InitializeParams, InitializeResult, TextDocumentSyncKind, DidChangeConfigurationNotification } from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";
import { registerDefinitionHandler } from "./handlers/definition.js";
import { registerFileEventHandlers } from "./handlers/fileEvents.js";
import { setDocuments } from "./utils/documentUtils.js";
import { registerSettingsChangeHandlers } from "./handlers/settingsEvents.js";
import { setWorkspaceFolders } from "./utils/workspaceUtils.js";
import { COMMAND_IDS, registerCommandHandlers } from "./handlers/commands.js";
import { registerHoverHandler } from "./handlers/hover.js";
import { initSettings } from "./utils/settingsUtils.js";
import { initLogger, log } from "./utils/logger.js";
import { initProgress } from "./utils/progressUtils.js";

// Create a connection for the server, and a document manager
const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
setDocuments(documents);
initLogger(connection);
initProgress(connection);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

connection.onInitialize((params: InitializeParams): InitializeResult => {
  const capabilities = params.capabilities;

  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );

  const initWorkspaceFolders = params.workspaceFolders?.length
    ? params.workspaceFolders
    : params.rootUri
      ? [{ uri: params.rootUri, name: "root" }]
      : params.rootPath
        ? [{ uri: URI.file(params.rootPath).toString(), name: "root" }]
        : [];
  setWorkspaceFolders(initWorkspaceFolders);

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      definitionProvider: true,
      hoverProvider: true,
      executeCommandProvider: {
        commands: [...COMMAND_IDS]
      }
    }
  };

  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true
      }
    };
  }

  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
    void initSettings(connection);
  }

  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      log("Workspace folder change event received.");
    });
  }
});

// Event handlers (file + setting change events)
registerFileEventHandlers(documents, connection);
registerSettingsChangeHandlers(connection);

// LSP capability handlers (goto def, find refs, etc...)
registerDefinitionHandler(connection, documents);
registerCommandHandlers(connection);
registerHoverHandler(connection, documents);

// Listeners
documents.listen(connection);
connection.listen();

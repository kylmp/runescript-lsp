import { createConnection, TextDocuments, ProposedFeatures, InitializeParams, InitializeResult, TextDocumentSyncKind, DidChangeConfigurationNotification } from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";
import { registerDefinitionHandler } from "./handler/definition.js";
import { registerFileEventHandlers } from "./handler/fileEvents.js";
import { registerGitEventHandlers } from "./handler/gitEvents.js";
import { registerWorkspaceEventHandlers } from "./handler/workspaceEvents.js";
import { registerReferencesHandler } from "./handler/references.js";
import { getSemanticTokensLegend, registerSemanticTokensHandler } from "./handler/semanticTokens.js";
import { registerColorProviderHandler } from "./handler/colorProvider.js";
import { allTriggers, registerCompletionHandler } from "./handler/completion.js";
import { registerSignatureHelpHandler } from "./handler/signatureHelp.js";
import { registerRenameHandler } from "./handler/rename.js";
import { setDocuments } from "./utils/documentUtils.js";
import { registerSettingsChangeHandlers } from "./handler/settingsEvents.js";
import { setWorkspaceFolders } from "./utils/workspaceUtils.js";
import { COMMAND_IDS, registerCommandHandlers } from "./handler/commands.js";
import { registerHoverHandler } from "./handler/hover.js";
import { initSettings } from "./utils/settingsUtils.js";
import { initLogger } from "./utils/logger.js";
import { initProgress } from "./utils/progressUtils.js";
import { initHighlights } from "./utils/highlightUtils.js";
import { initDiagnostics } from "./utils/diagnosticsUtils.js";
import { initConnection } from "./utils/connectionUtils.js";
import { startInit } from "./utils/initUtils.js";
import { rebuildAllWorkspaces } from "./manager.js";

// Create a connection for the server, and a document manager
const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
setDocuments(documents);
initLogger(connection);
initConnection(connection);
initProgress(connection);
initHighlights(connection);
initDiagnostics(connection);

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
      referencesProvider: true,
      hoverProvider: true,
      completionProvider: {
        triggerCharacters: allTriggers
      },
      signatureHelpProvider: {
        triggerCharacters: [],
        retriggerCharacters: []
      },
      renameProvider: true,
      colorProvider: true,
      semanticTokensProvider: {
        legend: getSemanticTokensLegend(),
        full: true
      },
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
    registerWorkspaceEventHandlers(connection);
  }

  startInit(rebuildAllWorkspaces());
});

// Event handlers (file + setting change events)
registerFileEventHandlers(documents, connection);
registerSettingsChangeHandlers(connection);
registerGitEventHandlers(connection);

// LSP capability handlers (goto def, find refs, etc...)
registerDefinitionHandler(connection);
registerReferencesHandler(connection);
registerCommandHandlers(connection);
registerHoverHandler(connection);
registerCompletionHandler(connection);
registerSignatureHelpHandler(connection);
registerRenameHandler(connection);
registerSemanticTokensHandler(connection);
registerColorProviderHandler(connection);

// Listeners
documents.listen(connection);
connection.listen();

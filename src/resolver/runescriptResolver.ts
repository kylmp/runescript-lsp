import type { WorkspaceCache } from "../cache/WorkspaceCache.js";
import type { ParseResult } from "../parser/parser.js";
import type { DataRange, FileInfo, ResolvedData } from "../types.js";
import type { Resolver } from "./resolver.js";
import { getScriptTriggerSymbol } from "../resource/scriptTriggers.js";
import { RunescriptFile } from "../parser/runescriptParser.js";
import { warn } from "../utils/logger.js";
import { buildSymbolFromRef, buildSymbolFromDec, buildModifiedWordContext } from "../utils/symbolBuilder.js";
import { SymbolType } from "../resource/enum/symbolTypes.js";
import { resolveRefDataRange, resolveDefDataRange, toCoord } from "../utils/resolverUtils.js";
import { AssignmentStatement, AstVisitor, CalcExpression, ConditionExpression, Expression, findSmallestNodeAtPosition, Node, NodeKind, PTagStringPart } from "runescript-parser";
import { CommandCallExpression, Identifier } from "runescript-parser";
import { CallExpression, DeclarationStatement, Literal, ReturnStatement, Script, StringPart, SwitchStatement, VariableExpression } from "runescript-parser";
import { FileCache } from "../cache/FileCache.js";
import { typeToSymbolType } from "../resource/symbolConfig.js";
import { Type } from "../resource/enum/types.js";
import { SymbolCache } from "../cache/SymbolCache.js";
import { Position } from "vscode-languageserver-textdocument";

export const ScriptResolver: Resolver = {
  resolveDefinitions,
  resolveReferences
}

function resolveDefinitions(parseResult: ParseResult, cache: WorkspaceCache): DataRange<ResolvedData>[] {
  const file = parseResult.data as RunescriptFile;
  const fileCache = cache.getFileCache(parseResult.fileInfo.fsPath);
  const resolvedDefs: DataRange<ResolvedData>[] = [];
  for (const script of file.scripts) {
    fileCache?.addScriptRange(script.parsedScript.source.line, script.parsedScript.source.endLine, script.parsedScript.nameString);
    const trigger = script.parsedScript.trigger;
    const triggerType = getScriptTriggerSymbol(trigger.text);
    if (!triggerType) {
      warn(`Unable to resolve trigger details for trigger ${trigger.text}`);
      continue;
    }
    // Resolve trigger symbol
    const triggerSymbol = buildSymbolFromRef(trigger.text, SymbolType.Trigger, parseResult.fileInfo.type);
    resolvedDefs.push(resolveDefDataRange(trigger.source.column, trigger.source.endColumn, trigger.source.line, triggerSymbol, false));

    // Resolve script symbol
    const source = script.parsedScript.name.source;
    const end = script.parsedScript.isStar ? source.endColumn + 1 : source.endColumn;
    if (triggerType.declaration) {
      const scriptSymbol = buildSymbolFromDec(script.parsedScript.nameString, triggerType.symbolType, parseResult.fileInfo, source.line, source.column, source.endColumn, {info: script.info, signature: script.signature});
      resolvedDefs.push(resolveDefDataRange(source.column, end, source.line, scriptSymbol, triggerType.declaration));
    } else {
      const rawName = script.parsedScript.nameString;
      if (rawName.startsWith('_')) {
        if (rawName.length === 1) {
          const name = `all ${triggerType.symbolType}s`;
          const context = buildModifiedWordContext('_');
          const extraData = { symbolType: triggerType.symbolType };
          resolvedDefs.push(resolveRefDataRange(SymbolType.Category, source.column, end, source.line, name, parseResult.fileInfo.type, context, extraData));
        } else {
          const name = rawName.substring(1);
          const context = buildModifiedWordContext(script.parsedScript.nameString, '_');
          const extraData = { symbolType: triggerType.symbolType, categoryName: name };
          resolvedDefs.push(resolveRefDataRange(SymbolType.Category, source.column, end, source.line, name, parseResult.fileInfo.type, context, extraData));
        }
      } else {
        resolvedDefs.push(resolveRefDataRange(triggerType.symbolType, source.column, end, source.line, script.parsedScript.nameString, parseResult.fileInfo.type));
      }
    }
 
    // Resolve param (local vars)
    if (fileCache) {
      for (const param of (script.parsedScript.parameters ?? [])) {
        const paramSymbol = buildSymbolFromDec(param.name.text, SymbolType.LocalVar, parseResult.fileInfo, param.source.line, param.name.source.column, param.name.source.endColumn, {extraData: {type: param.typeToken.text}});
        paramSymbol.comparisonTypes = [typeToSymbolType(param.typeToken.text as Type)];
        paramSymbol.block = `${param.typeToken.text} ${param.name.text} (parameter)`;
        fileCache.addLocalVariable(paramSymbol, param.source.line, param.name.source.column, param.name.source.endColumn);
      }
    }
  }
  return resolvedDefs;
}

function resolveReferences(parseResult: ParseResult, cache: WorkspaceCache): DataRange<ResolvedData>[] {
  const file = parseResult.data as RunescriptFile;
  const resolvedRefs: DataRange<ResolvedData>[] = [];
  const visitor = new RunescriptVisitor(resolvedRefs, parseResult.fileInfo, cache);
  for (const script of file.scripts) {
    script.parsedScript.accept(visitor);
  }
  visitor.finalize();
  return resolvedRefs;
}

export function resolveSymbolTypeFromScriptPosition(parsedScript: Script, fileInfo: FileInfo, cache: WorkspaceCache, lineNum: number, index: number): SymbolType {
  const resolvedRefs: DataRange<ResolvedData>[] = [];
  const visitor = new RunescriptVisitor(resolvedRefs, fileInfo, cache, true);
  parsedScript.accept(visitor);
  visitor.finalize();
  const node = findSmallestNodeAtPosition(parsedScript, lineNum, index);
  return node !== null ? visitor.getNodeSymbolType(node) ?? SymbolType.Unknown : SymbolType.Unknown;
}

class RunescriptVisitor extends AstVisitor<void> {
  private readonly fileCache: FileCache | undefined;
  private readonly symbolCache: SymbolCache;
  private readonly resolvedNodes: WeakMap<Node, SymbolType>;
  private readonly unknownIdens: Set<Identifier>;
  private readonly exprTypes: WeakMap<Expression, SymbolType[]>;
  private readonly resolvedRefs: DataRange<ResolvedData>[];
  private readonly localVariableTypes: Map<string, SymbolType>;
  private readonly fileInfo: FileInfo;
  private readonly dryRun: boolean;

  constructor(resolvedRefs: DataRange<ResolvedData>[], fileInfo: FileInfo, cache: WorkspaceCache, dryRun = false) {
    super();
    this.unknownIdens = new Set<Identifier>();
    this.localVariableTypes = new Map<string, SymbolType>();
    this.resolvedNodes = new WeakMap<Node, SymbolType>();
    this.exprTypes = new WeakMap<Expression, SymbolType[]>();
    this.resolvedRefs = resolvedRefs;
    this.fileInfo = fileInfo;
    this.symbolCache = cache.getSymbolCache();
    this.fileCache = cache.getFileCache(fileInfo.fsPath);
    this.dryRun = dryRun;
  }

  public finalize(): void {
    this.unknownIdens.forEach(unknownIden => {
      if (!this.resolvedNodes.has(unknownIden)) {
        this.resolveRefFromNode(SymbolType.Unknown, unknownIden, unknownIden.text);
      }
    });
  }

  public getNodeSymbolType(node: Node): SymbolType | undefined {
    return this.resolvedNodes.get(node);
  }

  private resolveRefFromNode(symbolType: SymbolType, node: Node, name: string, isStar = false) {
    if (this.resolvedNodes.has(node)) return;
    this.resolvedRefs.push(resolveRefDataRange(
      symbolType,
      node.source.column,
      isStar ? node.source.endColumn + 1 : node.source.endColumn,
      node.source.line,
      name,
      this.fileInfo.type
    ));
    this.resolvedNodes.set(node, symbolType);
  }

  private resolveRefManual(symbolType: SymbolType, node: Node, name: string, line: number, start: number, end: number) {
    if (this.resolvedNodes.has(node)) return;
    this.resolvedRefs.push(resolveRefDataRange(symbolType, start, end, line, name, this.fileInfo.type));
    this.resolvedNodes.set(node, symbolType);
  }

  private getScript(node: Node): Script | null {
    let cur: Node | null = node;
    while (cur !== null && !(cur instanceof Script)) {
      cur = cur.parent;
    }
    return cur;
  }

  private isCommand(identifier: Identifier) {
    const symbol = this.symbolCache.get(identifier.text, SymbolType.Command);
    return !!symbol?.declaration;
  }

  private resolveCall(node: CallExpression, calleeType: SymbolType): void {
    let queueName: string | undefined;
    const calleeSignature = this.symbolCache.get(node.name.text, calleeType)?.signature;
    if (calleeSignature?.returns) {
      this.exprTypes.set(node, calleeSignature.returns.map(r => r.symbolType));
    }
    if (node.arguments.length > 0 && calleeSignature?.params) {
      const calleeParams = calleeSignature?.params;
      for (let i = 0; i < calleeParams.length; i++) {
        const argument = node.arguments[i];
        if (argument instanceof Identifier) {
          const symbolType = this.isCommand(argument) ? SymbolType.Command : calleeParams[i].symbolType;
          if (symbolType === SymbolType.Queue && i === 0) queueName = argument.text;
          this.resolveRefFromNode(symbolType, argument, argument.text);
        }
      }
    }
    if (node instanceof CommandCallExpression && node.arguments2 && queueName) {
      const queueParams = this.symbolCache.get(queueName, SymbolType.Queue)?.signature?.params ?? [];
      if (queueParams.length > 0) {
        for (let i = 0; i < Math.min(queueParams.length, node.arguments2.length); i++) {
          const argument = node.arguments2[i];
          if (argument instanceof Identifier) {
            const symbolType = this.isCommand(argument) ? SymbolType.Command : queueParams[i].symbolType;
            this.resolveRefFromNode(symbolType, argument, argument.text);
          }
        }
      }
    }
  }

  protected visitNode(node: Node): void {
    for (const child of node.children) {
      child.accept(this);
    }
  }

  public visitScript(node: Script): void {
    this.localVariableTypes.clear();
    this.resolvedNodes.set(node.trigger, SymbolType.Trigger);
    this.resolvedNodes.set(node.name, SymbolType.Unknown);
    for (const param of (node.parameters ?? [])) {
      this.localVariableTypes.set(param.name.text, typeToSymbolType(param.typeToken.text as Type));
      this.resolvedNodes.set(param.name, SymbolType.Unknown);
    }
    super.visitScript(node);
  }

  public visitIdentifier(node: Identifier): void {
    if (this.isCommand(node)) {
      this.resolveRefFromNode(SymbolType.Command, node, node.text);
    } 
    else {
      this.unknownIdens.add(node);
      //this.resolveRefFromNode(SymbolType.Unknown, node, node.text);
    }
    super.visitIdentifier(node);
  }

  public visitCallExpression(node: CallExpression): void {
    if (node.kind === NodeKind.ProcCallExpression) {
      this.resolveRefFromNode(SymbolType.Proc, node.name, node.name.text);
      this.resolveCall(node, SymbolType.Proc);
    }
    else if (node.kind === NodeKind.JumpCallExpression) {
      this.resolveRefFromNode(SymbolType.Label, node.name, node.name.text);
      this.resolveCall(node, SymbolType.Label);
    }
    else if (node instanceof CommandCallExpression) {
      this.resolveRefFromNode(SymbolType.Command, node.name, node.nameString, node.isStar);
      this.resolveCall(node, SymbolType.Command);
    }
    super.visitCallExpression(node); 
  }

  public visitJoinedStringPart(node: StringPart): void {
    if (node.kind === NodeKind.BasicStringPart) {
      this.resolveRefFromNode(SymbolType.String, node, "string");
    }
    if (node instanceof PTagStringPart) {
      const startIdx = node.source.column + 3;
      const endIdx = node.source.endColumn - 1;
      const name = node.value.substring(3, node.value.length - 1);
      this.resolveRefManual(SymbolType.Mesanim, node, name, node.source.line, startIdx, endIdx);
    }
    super.visitJoinedStringPart(node);
  }

  public visitLiteral(node: Literal<unknown>): void {
    let symbolType = SymbolType.Unknown;
    let name = 'unknown';
    if (node.kind === NodeKind.NullLiteral) {
      symbolType = SymbolType.Null;
      name = "null";
    }
    else if (node.kind === NodeKind.CoordLiteral) {
      symbolType = SymbolType.Coordinates;
      name = toCoord(node.value as number);
    }
    else if (node.kind === NodeKind.IntegerLiteral) {
      symbolType = SymbolType.Number;
      name = "number";
    }
    else if (node.kind === NodeKind.StringLiteral || node.kind === NodeKind.CharacterLiteral) {
      symbolType = SymbolType.String;
      name = "string";
    }
    else if (node.kind === NodeKind.BooleanLiteral) {
      symbolType = SymbolType.Boolean;
      name = "boolean";
    }

    if (symbolType !== SymbolType.Unknown) {
      this.resolveRefFromNode(symbolType, node, name);
      this.exprTypes.set(node, [symbolType]);
    }

    super.visitLiteral(node);
  }

  public visitVariableExpression(node: VariableExpression): void {
    if ((this.dryRun || this.fileCache) && node.kind === NodeKind.LocalVariableExpression) {
      if (!this.dryRun) this.fileCache!.addLocalVariableReference(node.name.text, node.name.source.line, node.name.source.column, node.name.source.endColumn);
      this.resolvedNodes.set(node.name, SymbolType.LocalVar);
      const symbolType = this.localVariableTypes.get(node.name.text);
      if (symbolType) {
        this.exprTypes.set(node, [symbolType]);
      }
    }
    else if (node.kind === NodeKind.ConstantVariableExpression) {
      this.resolveRefFromNode(SymbolType.Constant, node.name, node.name.text);
      const exprTypes = this.symbolCache.get(node.name.text, SymbolType.Constant)?.comparisonTypes ?? [];
      this.exprTypes.set(node, exprTypes);
    }
    else if (node.kind === NodeKind.GameVariableExpression) {
      this.resolveRefFromNode(SymbolType.GameVar, node.name, node.name.text);
      const exprTypes = this.symbolCache.get(node.name.text, SymbolType.GameVar)?.comparisonTypes ?? [];
      this.exprTypes.set(node, exprTypes);
    }
    super.visitVariableExpression(node);
  }

  public visitDeclarationStatement(node: DeclarationStatement): void {
    const type = node.typeToken.text;
    let localVarType = SymbolType.Unknown;
    if ((this.fileCache || this.dryRun) && type.startsWith('def_')) {
      const typeStr = type.substring(4);
      const localVarSymbol = buildSymbolFromDec(node.name.text, SymbolType.LocalVar, this.fileInfo, node.name.source.line, node.name.source.column, node.name.source.endColumn, {extraData: {type: typeStr}});
      localVarSymbol.block = `${typeStr} ${node.name.text}`;
      localVarSymbol.comparisonTypes = [typeToSymbolType(typeStr as Type)];
      if (!this.dryRun) this.fileCache!.addLocalVariable(localVarSymbol, node.name.source.line, node.name.source.column, node.name.source.endColumn);
      this.resolvedNodes.set(node.name, SymbolType.LocalVar);
      localVarType = typeToSymbolType(typeStr as Type);
      this.localVariableTypes.set(node.name.text, localVarType);
    }

    super.visitDeclarationStatement(node);

    if (node.initializer instanceof Identifier) {
      this.resolveRefFromNode(localVarType, node.initializer, node.initializer.text);
    }
  } 

  public visitSwitchStatement(node: SwitchStatement): void {
    const type = typeToSymbolType(node.typeToken.text.substring(7) as Type);
    for (const switchCase of node.cases) {
      for (const key of switchCase.keys) {
        if (key instanceof Identifier) {
          this.resolveRefFromNode(type, key, key.text);
        }
      }
    }
    super.visitSwitchStatement(node);
  }

  public visitReturnStatement(node: ReturnStatement): void {
    if (node.expressions.length > 0) {
      for (let i = 0; i < node.expressions.length; i++) {
        const expression = node.expressions[i];
        if (expression instanceof Identifier) {
          if (this.isCommand(expression)) {
            this.resolveRefFromNode(SymbolType.Command, expression, expression.text);
          } else {
            const returnTokens = this.getScript(expression)?.returnTokens ?? [];
            const returnToken = returnTokens[i];
            if (returnToken) {
              this.resolveRefFromNode(typeToSymbolType(returnToken.text as Type), expression, expression.text);
            }
          }
        }
      }
    }
    super.visitReturnStatement(node);
  }

  public visitAssignmentStatement(assignmentStatement: AssignmentStatement): void {
    if (assignmentStatement.expressions.length > 1) {
      warn(`Unable to handle assignment statement with multiple expressions. line=${assignmentStatement.source.line} file=${this.fileInfo.fsPath}`);
    } else {
      // assignmentStatement.vars
      // (diagnostics) length of variables should match the length of the expression return types and types should match
      // enchantment.rs2
      // $final_obj, $anim, $spotanim, $sound = ~magic_spell_search_convertobj($spell_data, $initial_obj);
    }
    super.visitAssignmentStatement(assignmentStatement);
  }

  public visitCalcExpression(node: CalcExpression): void {
    this.resolveRefManual(SymbolType.Command, node, "calc", node.source.line, node.source.column, node.source.column + 4);
    super.visitCalcExpression(node);
  }

  public visitConditionExpression(node: ConditionExpression): void {
    super.visitConditionExpression(node);

    if (node.right instanceof Identifier && node.left instanceof Identifier) {
      const rightCommand = this.resolveCommandIfAny(node.right);
      const leftCommand = this.resolveCommandIfAny(node.left);
      this.resolveFromCommandReturn(rightCommand, node.left);
      this.resolveFromCommandReturn(leftCommand, node.right);
      return;
    }

    if (node.right instanceof Identifier) {
      if (!this.resolveCommandIfAny(node.right)) {
        this.resolveFromExpressionType(node.right, this.exprTypes.get(node.left));
      }
      return;
    }

    if (node.left instanceof Identifier) {
      if (!this.resolveCommandIfAny(node.left)) {
        this.resolveFromExpressionType(node.left, this.exprTypes.get(node.right));
      }
    }
  }

  private resolveCommandIfAny(identifier: Identifier): string | undefined {
    if (!this.isCommand(identifier)) return undefined;
    this.resolveRefFromNode(SymbolType.Command, identifier, identifier.text);
    return identifier.text;
  }

  private resolveFromCommandReturn(commandName: string | undefined, target: Identifier): void {
    if (!commandName) return;
    const commandReturns = this.symbolCache.get(commandName, SymbolType.Command)?.signature?.returns ?? [];
    if (commandReturns.length > 0) {
      this.resolveRefFromNode(commandReturns[0].symbolType, target, target.text);
    }
  }

  private resolveFromExpressionType(target: Identifier, types?: SymbolType[]): void {
    if (!types || types.length === 0) return;
    this.resolveRefFromNode(types[0], target, target.text);
    this.exprTypes.set(target, types);
  }
}

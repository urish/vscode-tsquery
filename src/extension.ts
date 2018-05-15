'use strict';

require('util.promisify/shim')();

import * as util from 'util'
import * as vscode from 'vscode';
import * as path from 'path';
import { tsquery } from '@phenomnomnominal/tsquery';
import { getProgram } from 'typewiz-core';
import { createCompilerHost, Node, SyntaxKind } from 'typescript';
import { getNodeAtFileOffset } from './utils';

interface IResult extends vscode.QuickPickItem {
  nodes: Node[];
}

class Operation implements vscode.QuickPickItem {
  public constructor(public label: string, public description : string = "", public detail : string = "", public func: (op:Operation)=>void) {
  }
  public execute() {
    this.func(this)
  }
}

function highlightNode(editor: vscode.TextEditor, node: Node) {
  const startPos = editor.document.positionAt(node.getStart());
  const endPos = editor.document.positionAt(node.getEnd());
  editor.selection = new vscode.Selection(startPos, endPos);
  editor.revealRange(new vscode.Range(startPos, endPos));
}

async function showResults(matches: Node[][]) {
  const filenames = matches.map(
    item =>
      ({
        label: vscode.workspace.asRelativePath(item[0].getSourceFile().fileName),
        description: `${item.length} matches`,
        nodes: item,
      } as IResult),
  );

  const result = await vscode.window.showQuickPick(filenames);
  if (result) {
    const firstMatch = result.nodes[0];
    const editor = await vscode.window.showTextDocument(vscode.Uri.file(firstMatch.getSourceFile().fileName));
    highlightNode(editor, firstMatch);
  }
}

function getOps() : Array<vscode.QuickPickItem> {
  return [
    new Operation( "Find all uses of 'any'",  "Query: 'AnyKeyword'", 
                   "This operation will search the current file for all variables and parameters that have the type 'any'", 
                   () => astCustomQueryFile("AnyKeyword")
                  ),
    new Operation( "Custom search",  "write your own TSQuery expression", "examples:..", () => astCustomQueryFile()),
  ]
}

function getEditor() : vscode.TextEditor | null {
  const editor = vscode.window.activeTextEditor;
  const supportedLanguageIds = ['javascript', 'javascriptreact', 'typescript', 'typescriptreact'];
  if (!editor || supportedLanguageIds.indexOf(editor.document.languageId) < 0) {
    vscode.window.showErrorMessage('AST Queries only supported for TypeScript and JavaScript files');
    return null;
  }
  return editor
}

async function astQueryFile() {
  const editor = getEditor()
  if (!editor) return;

  const op : Operation = await vscode.window.showQuickPick(getOps(),{
    placeHolder: "Please select a query",
    onDidSelectItem: (item:vscode.QuickPickItem) => {
      vscode.window.showInformationMessage(util.inspect(item))
    },
    matchOnDescription: true,
  }) as Operation

  vscode.window.showInformationMessage(op ? op.label :  "no selection")

  if ( op ) {
    op.execute()
  }
}

async function astCustomQueryFile(astQuery?:string) {
  const editor = getEditor()
  if (!editor) return;

  if ( astQuery == undefined ) {
    astQuery = await vscode.window.showInputBox({
      prompt: 'AST Query to search for. Example queries:',
      placeHolder: 'e.g. Constructor',
    });
  }
  if (astQuery) {
    const ast = tsquery.ast(editor.document.getText(), editor.document.fileName);
    const nodes = tsquery(ast, astQuery);
    if (nodes.length) {
      highlightNode(editor, nodes[0]);
    } else {
      vscode.window.showInformationMessage('No results found :-(');
    }
  }
}

async function astQueryWorkspace() {
  const tsconfigFiles = await vscode.workspace.findFiles('tsconfig.json');
  if (!tsconfigFiles.length) {
    vscode.window.showErrorMessage('Could not find any tsconfig.json file in your project');
  }
  if (tsconfigFiles.length > 1) {
    console.error('TODO: Implement quick pick here');
  }

  const astQuery = await vscode.window.showInputBox({
    prompt: 'AST Query to search for',
    placeHolder: 'e.g. Constructor',
  });
  if (astQuery) {
    const tsconfigPath = tsconfigFiles[0].fsPath;
    const program = getProgram({
      rootDir: path.dirname(tsconfigPath),
      tsConfig: tsconfigPath,
      tsCompilerHost: createCompilerHost({}, true),
    });

    if (!program) {
      vscode.window.showErrorMessage('Could not process typescript project');
      return;
    }

    const matches: Node[][] = [];
    for (let source of program.getSourceFiles()) {
      const nodes = tsquery(source, astQuery);
      if (nodes.length) {
        matches.push(nodes);
      }
    }

    if (matches.length) {
      showResults(matches);
    } else {
      vscode.window.showInformationMessage('No results found :-(');
    }
  }
}

const TS_MODE: vscode.DocumentFilter = { language: 'typescript', scheme: 'file' };

class TSHoverProvider implements vscode.HoverProvider {
  public provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
    const ast = tsquery.ast(document.getText());
    const node = getNodeAtFileOffset(ast, document.offsetAt(position));
    if (node) {
      return new vscode.Hover(new vscode.MarkdownString('AST Selector: `' + SyntaxKind[node.kind] + '`'));
    } else {
      return null;
    }
  }
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    ...[
      vscode.languages.registerHoverProvider(TS_MODE, new TSHoverProvider()),
      vscode.commands.registerCommand('extension.astQueryFile', astQueryFile),
      vscode.commands.registerCommand('extension.astQueryWorkspace', astQueryWorkspace),
    ],
  );
}

export function deactivate() {}

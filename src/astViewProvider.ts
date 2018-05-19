import * as vscode from 'vscode';
import * as ts from 'typescript';
import { tsquery } from '@phenomnomnominal/tsquery';
import { isSupportedLanguage, getNodeAtFileOffset } from './utils';

export class ASTViewProvider implements vscode.TreeDataProvider<ASTNodeItem>, vscode.Disposable {
  private _onDidChangeTreeData: vscode.EventEmitter<ASTNodeItem | null> = new vscode.EventEmitter<ASTNodeItem | null>();
  readonly onDidChangeTreeData: vscode.Event<ASTNodeItem | null> = this._onDidChangeTreeData.event;
  private treeView: vscode.TreeView<ASTNodeItem> | null = null;
  private readonly subscriptions: vscode.Disposable[];

  constructor() {
    this.subscriptions = [
      vscode.window.onDidChangeActiveTextEditor(() => this._onDidChangeTreeData.fire()),
      vscode.window.onDidChangeTextEditorSelection(e => this.revealItem(e.textEditor, e.selections[0].start)),
      vscode.workspace.onDidChangeTextDocument(() => this._onDidChangeTreeData.fire()),
    ];
  }

  dispose() {
    this.subscriptions.forEach(s => s.dispose());
  }

  private revealItem(editor: vscode.TextEditor, position: vscode.Position) {
    if (this.treeView && isSupportedLanguage(editor.document.languageId)) {
      const { document } = editor;
      const ast = tsquery.ast(document.getText());
      const node = getNodeAtFileOffset(ast, document.offsetAt(position));
      if (node) {
        this.treeView.reveal(new ASTNodeItem(node));
      }
    }
  }

  setTreeView(value: vscode.TreeView<ASTNodeItem>) {
    this.treeView = value;
  }

  getTreeItem(element: ASTNodeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ASTNodeItem): ASTNodeItem[] {
    if (element) {
      const children: ASTNodeItem[] = [];
      ts.forEachChild(element.node, child => {
        children.push(new ASTNodeItem(child));
      });
      return children;
    } else {
      const editor = vscode.window.activeTextEditor;
      if (editor && isSupportedLanguage(editor.document.languageId)) {
        const ast = tsquery.ast(editor.document.getText());
        return [new ASTNodeItem(ast)];
      } else {
        return [];
      }
    }
  }

  getParent?(element: ASTNodeItem): ASTNodeItem | null {
    const { parent } = element.node;
    return parent ? new ASTNodeItem(parent) : null;
  }
}

class ASTNodeItem extends vscode.TreeItem {
  constructor(readonly node: ts.Node) {
    super(
      ts.SyntaxKind[node.kind],
      node.getChildCount() ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
    );
  }

  get id() {
    return ts.SyntaxKind[this.node.kind] + '@' + this.node.getStart();
  }

  get command() {
    return {
      command: 'astView.revealASTNodeInSource',
      arguments: [this.node],
      title: 'Show in source code',
    };
  }

  get tooltip() {
    const syntaxKind = ts.SyntaxKind[this.node.kind];
    if (ts.isIdentifier(this.node)) {
      return `${syntaxKind}[name=${this.node.text}]`;
    } else {
      return syntaxKind;
    }
  }
}

import * as ts from 'typescript';
import * as vscode from 'vscode';
import * as minimatch from 'minimatch';

export function getNodeAtFileOffset(node: ts.Node, offset: number) {
  let result = null as ts.Node | null;
  const visit = (childNode: ts.Node) => {
    ts.forEachChild(childNode, visit);
    if (!result && (childNode.getStart() <= offset && childNode.getEnd() > offset)) {
      result = childNode;
    }
  };
  visit(node);
  return result;
}

export const supportedLanguageIds = ['javascript', 'javascriptreact', 'typescript', 'typescriptreact'];

export function isSupportedLanguage(langId: string) {
  return supportedLanguageIds.indexOf(langId) >= 0;
}

export function filterExcludedFiles(files: ReadonlyArray<ts.SourceFile>) {
  const excludedPatterns = vscode.workspace.getConfiguration('tsquery').get('exclude') as Array<string>;
  let filteredFiles = files;
  for (const pattern of excludedPatterns) {
    filteredFiles = files.filter(({ fileName }) => !minimatch(fileName, pattern, { dot: true }));
  }
  return filteredFiles;
}

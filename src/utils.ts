import * as ts from 'typescript';

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

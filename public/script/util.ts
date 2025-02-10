export function removeNode<T extends { parentNode?: { removeChild: (child: T) => void } | null | false }>(node: T) {
  if (node.parentNode) {
    node.parentNode.removeChild(node);
  }
}

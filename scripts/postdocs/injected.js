document.addEventListener("DOMContentLoaded", () => {
  const observer = new MutationObserver(mutations => {
    outerLoop: for (const mutation of mutations) {
      if (mutation.type === "childList") {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1 && node.children[0]?.innerHTML === "Documentation Powered by ReDoc") {
            node.parentNode.removeChild(node);
            observer.disconnect();
            break outerLoop;
          }
        }
      }
    }
  });
  observer.observe(document, { childList: true, subtree: true });
});

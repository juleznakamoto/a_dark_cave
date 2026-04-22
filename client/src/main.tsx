
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";

// Workaround for Google Translate (and similar) mutating text nodes, which
// leaves React reconciliation pointing at nodes whose real parent has changed.
// See facebook/react#11538. Swallow the two NotFoundError cases by delegating
// to the actual parentNode when it differs.
if (typeof Node === "function" && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      if (child.parentNode) {
        return originalRemoveChild.call(child.parentNode, child) as T;
      }
      return child;
    }
    return originalRemoveChild.apply(this, [child] as unknown as [Node]) as T;
  } as typeof Node.prototype.removeChild;

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (referenceNode.parentNode) {
        return originalInsertBefore.call(
          referenceNode.parentNode,
          newNode,
          referenceNode,
        ) as T;
      }
      return this.appendChild(newNode) as T;
    }
    return originalInsertBefore.apply(this, [
      newNode,
      referenceNode,
    ] as unknown as [Node, Node | null]) as T;
  } as typeof Node.prototype.insertBefore;
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

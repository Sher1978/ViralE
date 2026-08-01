'use client';

// 🛑 Prevent Google Translate / Browser Extension DOM manipulation crashes in React (insertBefore / removeChild)
if (typeof window !== 'undefined' && typeof Node !== 'undefined' && Node.prototype) {
  try {
    const originalInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function <T extends Node>(node: T, child: Node | null): T {
      if (child && child.parentNode !== this) {
        if (child.parentNode) {
          return child.parentNode.insertBefore(node, child) as T;
        }
        return this.appendChild(node) as T;
      }
      try {
        return originalInsertBefore.call(this, node, child) as T;
      } catch (e: any) {
        if (e.name === 'NotFoundError' || e.message?.includes('not found') || e.message?.includes('can not be found')) {
          return this.appendChild(node) as T;
        }
        throw e;
      }
    };

    const originalRemoveChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function <T extends Node>(child: T): T {
      if (child.parentNode !== this) {
        if (child.parentNode) {
          return child.parentNode.removeChild(child) as T;
        }
        return child;
      }
      try {
        return originalRemoveChild.call(this, child) as T;
      } catch (e: any) {
        if (e.name === 'NotFoundError' || e.message?.includes('not found') || e.message?.includes('can not be found')) {
          return child;
        }
        throw e;
      }
    };
  } catch (err) {
    console.warn('[DOMSafety] Failed to apply DOM safety patch:', err);
  }
}

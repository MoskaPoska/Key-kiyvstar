const fs = require('fs');
const path = require('path');
const vm = require('vm');

const VOID_TAGS = new Set(['INPUT', 'BR', 'HR', 'IMG', 'META', 'LINK']);

function decodeHtml(value) {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

class FakeClassList {
  constructor(element) {
    this.element = element;
  }

  _getSet() {
    return new Set((this.element.className || '').split(/\s+/).filter(Boolean));
  }

  _write(set) {
    this.element.className = Array.from(set).join(' ');
  }

  add(...names) {
    const set = this._getSet();
    names.forEach((name) => set.add(name));
    this._write(set);
  }

  remove(...names) {
    const set = this._getSet();
    names.forEach((name) => set.delete(name));
    this._write(set);
  }

  contains(name) {
    return this._getSet().has(name);
  }

  toggle(name, force) {
    const has = this.contains(name);
    if (force === true || (!has && force !== false)) {
      this.add(name);
      return true;
    }

    if (has && force !== true) {
      this.remove(name);
      return false;
    }

    return has;
  }
}

class FakeNode {
  constructor(ownerDocument) {
    this.ownerDocument = ownerDocument;
    this.parentNode = null;
    this.childNodes = [];
  }

  appendChild(node) {
    const nextNode = typeof node === 'string'
      ? new FakeTextNode(this.ownerDocument, node)
      : node;

    if (nextNode.parentNode) {
      nextNode.parentNode.removeChild(nextNode);
    }

    this.childNodes.push(nextNode);
    nextNode.parentNode = this;
    if (this.ownerDocument) {
      this.ownerDocument._registerTree(nextNode);
    }
    return nextNode;
  }

  removeChild(node) {
    const index = this.childNodes.indexOf(node);
    if (index === -1) {
      return null;
    }

    this.childNodes.splice(index, 1);
    node.parentNode = null;
    return node;
  }

  replaceChild(newNode, oldNode) {
    const index = this.childNodes.indexOf(oldNode);
    if (index === -1) {
      return null;
    }

    if (newNode.parentNode) {
      newNode.parentNode.removeChild(newNode);
    }

    this.childNodes[index] = newNode;
    newNode.parentNode = this;
    oldNode.parentNode = null;
    if (this.ownerDocument) {
      this.ownerDocument._registerTree(newNode);
    }
    return oldNode;
  }

  get children() {
    return this.childNodes.filter((node) => node.nodeType === 1);
  }

  get textContent() {
    return this.childNodes.map((node) => node.textContent).join('');
  }

  set textContent(value) {
    this.childNodes = [];
    if (value !== undefined && value !== null && value !== '') {
      this.appendChild(new FakeTextNode(this.ownerDocument, String(value)));
    }
  }
}

class FakeTextNode extends FakeNode {
  constructor(ownerDocument, value) {
    super(ownerDocument);
    this.nodeType = 3;
    this.value = String(value);
  }

  get textContent() {
    return this.value;
  }

  set textContent(value) {
    this.value = String(value);
  }

  cloneNode() {
    return new FakeTextNode(this.ownerDocument, this.value);
  }
}

class FakeElement extends FakeNode {
  constructor(ownerDocument, tagName) {
    super(ownerDocument);
    this.nodeType = 1;
    this.tagName = String(tagName).toUpperCase();
    this.attributes = {};
    this.style = {};
    this.dataset = {};
    this.eventListeners = {};
    this.value = '';
    this.checked = false;
    this.disabled = false;
    this.selected = false;
    this.href = '';
    this.title = '';
    this.type = '';
    this.onclick = null;
  }

  get id() {
    return this.attributes.id || '';
  }

  set id(value) {
    this.attributes.id = String(value);
    if (this.ownerDocument) {
      this.ownerDocument._idMap.set(String(value), this);
    }
  }

  get className() {
    return this.attributes.class || '';
  }

  set className(value) {
    this.attributes.class = String(value);
  }

  get classList() {
    return new FakeClassList(this);
  }

  setAttribute(name, value = '') {
    const attrName = String(name);
    const attrValue = decodeHtml(value);
    this.attributes[attrName] = attrValue;

    if (attrName === 'id') {
      this.id = attrValue;
      return;
    }

    if (attrName === 'class') {
      this.className = attrValue;
      return;
    }

    if (attrName === 'value') {
      this.value = attrValue;
    }

    if (attrName === 'href') {
      this.href = attrValue;
    }

    if (attrName === 'title') {
      this.title = attrValue;
    }

    if (attrName === 'type') {
      this.type = attrValue;
    }

    if (attrName === 'checked') {
      this.checked = true;
    }

    if (attrName === 'disabled') {
      this.disabled = true;
    }

    if (attrName === 'selected') {
      this.selected = true;
    }

    if (attrName.startsWith('data-')) {
      const key = attrName
        .slice(5)
        .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      this.dataset[key] = attrValue;
    }
  }

  getAttribute(name) {
    return this.attributes[name];
  }

  addEventListener(type, listener) {
    if (!this.eventListeners[type]) {
      this.eventListeners[type] = [];
    }
    this.eventListeners[type].push(listener);
  }

  dispatchEvent(event) {
    const nextEvent = event || {};
    nextEvent.type = nextEvent.type || 'event';
    nextEvent.target = nextEvent.target || this;
    nextEvent.currentTarget = this;
    nextEvent.defaultPrevented = false;
    nextEvent.preventDefault = nextEvent.preventDefault || function preventDefault() {
      this.defaultPrevented = true;
    };
    nextEvent.stopPropagation = nextEvent.stopPropagation || function stopPropagation() {};

    const listeners = this.eventListeners[nextEvent.type] || [];
    listeners.forEach((listener) => listener(nextEvent));

    if (nextEvent.type === 'click' && typeof this.onclick === 'function') {
      this.onclick(nextEvent);
    }

    return !nextEvent.defaultPrevented;
  }

  click() {
    this.dispatchEvent({ type: 'click' });
  }

  cloneNode(deep = false) {
    const clone = new FakeElement(this.ownerDocument, this.tagName);
    clone.attributes = { ...this.attributes };
    clone.style = { ...this.style };
    clone.dataset = { ...this.dataset };
    clone.value = this.value;
    clone.checked = this.checked;
    clone.disabled = this.disabled;
    clone.selected = this.selected;
    clone.href = this.href;
    clone.title = this.title;
    clone.type = this.type;
    clone.onclick = this.onclick;

    if (clone.attributes.id && clone.ownerDocument) {
      clone.ownerDocument._idMap.set(clone.attributes.id, clone);
    }

    if (deep) {
      this.childNodes.forEach((child) => {
        clone.appendChild(child.cloneNode(true));
      });
    }

    return clone;
  }

  get innerHTML() {
    return this.childNodes.map((node) => node.textContent).join('');
  }

  set innerHTML(value) {
    this.childNodes = [];
    if (!value) {
      return;
    }
    parseHtmlInto(this, String(value), this.ownerDocument);
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    return querySelectorAllFrom(this, selector);
  }

  closest(selector) {
    let current = this;
    while (current && current.nodeType === 1) {
      if (matchesSimpleSelector(current, selector)) {
        return current;
      }
      current = current.parentNode;
    }
    return null;
  }
}

class FakeDocument extends FakeNode {
  constructor() {
    super(null);
    this.ownerDocument = this;
    this._idMap = new Map();
    this.body = new FakeElement(this, 'body');
    this.appendChild(this.body);
  }

  createElement(tagName) {
    return new FakeElement(this, tagName);
  }

  createTextNode(value) {
    return new FakeTextNode(this, value);
  }

  getElementById(id) {
    return this._idMap.get(id) || null;
  }

  querySelector(selector) {
    return this.body.querySelector(selector);
  }

  querySelectorAll(selector) {
    return this.body.querySelectorAll(selector);
  }

  _registerTree(node) {
    if (!node) {
      return;
    }

    if (node.nodeType === 1 && node.id) {
      this._idMap.set(node.id, node);
    }

    if (node.childNodes && node.childNodes.length) {
      node.childNodes.forEach((child) => this._registerTree(child));
    }
  }
}

function parseHtmlInto(parent, html, document) {
  const tokens = html.match(/<\/?[^>]+>|[^<]+/g) || [];
  const stack = [parent];

  tokens.forEach((token) => {
    if (token.startsWith('</')) {
      if (stack.length > 1) {
        stack.pop();
      }
      return;
    }

    if (token.startsWith('<')) {
      const match = token.match(/^<([a-zA-Z0-9-]+)([^>]*)\/?>$/);
      if (!match) {
        return;
      }

      const tagName = match[1];
      const attrs = match[2] || '';
      const element = document.createElement(tagName);
      const attrPattern = /([^\s=/>]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
      let attrMatch;
      while ((attrMatch = attrPattern.exec(attrs))) {
        const attrName = attrMatch[1];
        const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';
        element.setAttribute(attrName, attrValue);
      }

      stack[stack.length - 1].appendChild(element);

      const selfClosing = token.endsWith('/>') || VOID_TAGS.has(element.tagName);
      if (!selfClosing) {
        stack.push(element);
      }
      return;
    }

    stack[stack.length - 1].appendChild(document.createTextNode(decodeHtml(token)));
  });
}

function getDescendants(root) {
  const result = [];

  root.childNodes.forEach((child) => {
    if (child.nodeType === 1) {
      result.push(child);
      result.push(...getDescendants(child));
    }
  });

  return result;
}

function matchesSimpleSelector(element, selector) {
  const token = String(selector).trim();
  if (!token) {
    return false;
  }

  const attrMatch = token.match(/^([a-zA-Z0-9_-]+)\[([^=\]]+)="([^"]*)"\]$/);
  if (attrMatch) {
    return (
      element.tagName.toLowerCase() === attrMatch[1].toLowerCase() &&
      String(element.getAttribute(attrMatch[2]) || element[attrMatch[2]] || '') === attrMatch[3]
    );
  }

  if (token.startsWith('.')) {
    return element.classList.contains(token.slice(1));
  }

  if (token.startsWith('#')) {
    return element.id === token.slice(1);
  }

  const tagClassMatch = token.match(/^([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)$/);
  if (tagClassMatch) {
    return (
      element.tagName.toLowerCase() === tagClassMatch[1].toLowerCase() &&
      element.classList.contains(tagClassMatch[2])
    );
  }

  return element.tagName.toLowerCase() === token.toLowerCase();
}

function matchesSelectorChain(element, selectorParts) {
  if (!matchesSimpleSelector(element, selectorParts[selectorParts.length - 1])) {
    return false;
  }

  let current = element.parentNode;
  for (let index = selectorParts.length - 2; index >= 0; index -= 1) {
    while (current && current.nodeType === 1 && !matchesSimpleSelector(current, selectorParts[index])) {
      current = current.parentNode;
    }

    if (!current || current.nodeType !== 1) {
      return false;
    }

    current = current.parentNode;
  }

  return true;
}

function querySelectorAllFrom(root, selector) {
  const selectorParts = String(selector).trim().split(/\s+/).filter(Boolean);
  if (!selectorParts.length) {
    return [];
  }

  return getDescendants(root).filter((element) => matchesSelectorChain(element, selectorParts));
}

function appendElement(document, tagName, id) {
  const element = document.createElement(tagName);
  if (id) {
    element.id = id;
  }
  document.body.appendChild(element);
  return element;
}

function createBrowserContext(document, extraGlobals = {}) {
  const window = {};
  const context = {
    window,
    document,
    console,
    setTimeout,
    clearTimeout,
    ...extraGlobals,
  };

  window.window = window;
  window.document = document;

  Object.keys(extraGlobals).forEach((key) => {
    window[key] = extraGlobals[key];
  });

  return context;
}

function loadBrowserScript(relativePath, context) {
  const absolutePath = path.join(process.cwd(), relativePath);
  const source = fs.readFileSync(absolutePath, 'utf8');
  vm.runInNewContext(source, context, { filename: absolutePath });
}

module.exports = {
  FakeDocument,
  appendElement,
  createBrowserContext,
  loadBrowserScript,
};

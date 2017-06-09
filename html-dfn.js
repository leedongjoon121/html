// A fork of https://resources.whatwg.org/dfn.js which works for HTML's multipage version by using xrefs.json.
'use strict';

(function() {

var isMultipage = document.documentElement.classList.contains('split');
var dfnMapDone = false;
var dfnMap = {};
var dfnPanel;

function isCrossSpecDfn(dfn) {
  return dfn.firstChild && dfn.firstChild instanceof HTMLAnchorElement;
}

function dfnHandleClick(event) {
  if (event.button !== 0) {
    return;
  }
  var current = event.target;
  var node;
  var eventInDfnPanel = false;
  while (current) {
    if (current.localName === 'dfn') {
      node = current;
    }
    if (dfnPanel && current === dfnPanel) {
      eventInDfnPanel = true;
    }
    current = current.parentElement;
  }
  if (!eventInDfnPanel) {
    dfnClosePanel();
  }
  if (!node) {
    return;
  }
  var id = node.id || node.parentNode.id;
  var path = "";
  if (isMultipage) {
    path = location.pathname;
  }
  var specURL = "";
  if (isCrossSpecDfn(node)) {
    specURL = node.firstChild.href;
    event.preventDefault();
  }
  dfnLoad(id, path, specURL);
  node.appendChild(dfnPanel);
  if (isMultipage) {
    sessionStorage.dfnId = id;
    sessionStorage.dfnPath = path;
    sessionStorage.dfnSpecURL = specURL;
  }
}

function dfnLoad(id, path, specURL) {
  if (dfnPanel) {
    dfnPanel.remove();
    dfnPanel = null;
  }
  dfnPanel = dfnCreatePanel(id, path, specURL);
  var p = document.createElement('p');
  dfnPanel.appendChild(p);
  if (!dfnMapDone) {
    p.textContent = 'Loading cross-references…';
    fetch('/xrefs.json')
      .then(response => response.json())
      .then(data => {
        dfnMap = data;
        dfnMapDone = true;
        if (dfnPanel) {
          dfnFillInReferences(id);
        }
      }).catch(err => {
        p.textContent = 'Error loading cross-references.';
      });
  } else {
    dfnFillInReferences(id);
  }
}

function dfnCreatePanel(id, path, specURL) {
  var panel = document.createElement('div');
  panel.className = 'dfnPanel';
  if (id) {
    var permalinkP = document.createElement('p');
    var permalinkA = document.createElement('a');
    permalinkA.href = path + "#" + id;
    permalinkA.onclick = dfnClosePanel;
    permalinkA.textContent = '#' + id;
    permalinkP.appendChild(permalinkA);
    panel.appendChild(permalinkP);
  }
  if (specURL) {
    var realLinkP = document.createElement('p');
    realLinkP.className = 'spec-link';
    realLinkP.textContent = 'Spec: ';
    var realLinkA = document.createElement('a');
    realLinkA.href = specURL;
    realLinkA.onclick = dfnClosePanel;
    realLinkA.textContent = node.firstChild.href;
    realLinkP.appendChild(realLinkA);
    panel.appendChild(realLinkP);
  }
  panel.dataset.id = id;
  return panel;
}

function dfnFillInReferences(id) {
  var p = dfnPanel.lastChild;
  if (id in dfnMap) {
    p.textContent = 'Referenced in:';
    var ul = document.createElement('ul');
    var anchorMap = dfnMap[id];
    for (var header in anchorMap) {
      var li = document.createElement('li');
      for (var i = 0; i < anchorMap[header].length; i += 1) {
        var a = document.createElement('a');
        a.onclick = dfnMovePanel;
        a.href = anchorMap[header][i];
        if (!isMultipage) {
          a.href = a.href.substring(a.href.indexOf('#'));
        }
        if (i === 0) {
          var headerFormatted = header.replace(/</g, '&lt;');
          headerFormatted = headerFormatted.replace(/ ([^ ]+) (element(?!s)|attribute(?!s)|interface(?!s)|common interface|object)/g, ' <code>$1</code> $2');
          headerFormatted = headerFormatted.replace(/<code>(Before|After|Other|The|on|an|for|user|User|custom|Custom|built-in|abstract|exotic|global|settings|Browser|Serializable|Transferable|HTML|IDL|document)<\/code>/, '$1');
          headerFormatted = headerFormatted.replace(/(type=[^\)]+)/g, '<code>$1</code>');
          headerFormatted = headerFormatted.replace(/(Link type) "([^"]+)"/g, '$1 "<code>$2</code>"');
          headerFormatted = headerFormatted.replace(/(ImageBitmap|WindowOrWorkerGlobalScope|multipart\/x-mixed-replace|registerProtocolHandler\(\)|registerContentHandler\(\))|storage|/, '<code>$1</code>');
          a.innerHTML = headerFormatted;
        } else {
          li.appendChild(document.createTextNode(' '));
          a.appendChild(document.createTextNode('(' + (i + 1) + ')'));
        }
        li.appendChild(a);
      }
      ul.appendChild(li);
    }
    dfnPanel.appendChild(ul);
  } else {
    p.textContent = 'No references in this specification.';
  }
}

function dfnClosePanel(event) {
  if (dfnPanel) {
    dfnPanel.remove();
    dfnPanel = null;
  }
  if (event) {
    event.stopPropagation();
  }
  if (isMultipage) {
    delete sessionStorage.dfnId;
    delete sessionStorage.dfnPath;
    delete sessionStorage.dfnSpecURL;
  }
}

function dfnMovePanel(event) {
  if (!dfnPanel) {
    return;
  }
  dfnPanel.style.position = 'fixed';
  dfnPanel.style.left = '1em';
  dfnPanel.style.bottom = '1em';
  dfnPanel.style.maxWidth = '20em';
  dfnPanel.style.maxHeight = '50vh';
  dfnPanel.style.overflow = 'auto';
  if (event) {
    event.stopPropagation();
  }
}

function dfnRestoreOrClosePanelOnNav(event) {
  if (sessionStorage.dfnId) {
    var id = sessionStorage.dfnId;
    var path = sessionStorage.dfnPath;
    var specURL = sessionStorage.dfnSpecURL;
    if (!dfnPanel || (dfnPanel && dfnPanel.dataset.id !== id)) {
      dfnLoad(id, path, specURL);
      dfnMovePanel();
      document.body.insertBefore(dfnPanel, document.body.firstChild);
    }
  } else {
    dfnClosePanel();
  }
}

document.body.classList.add('dfnEnabled');
document.addEventListener('click', dfnHandleClick);
if (isMultipage) {
  document.addEventListener('DOMContentLoaded', dfnRestoreOrClosePanelOnNav);
  window.addEventListener('pageshow', dfnRestoreOrClosePanelOnNav);
}

})();

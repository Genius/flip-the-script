var overrides = localStorage;

var disabled;

chrome.runtime.onConnect.addListener(function (dev_tools_connection) {
  var listener = function (message, _, reply) {
    if (message.method === 'register') {
      overrides[message.url] = JSON.stringify(message.detail);
    } else if (message.method === 'release') {
      overrides.removeItem(message.url);
    } else if (message.method === 'setDisabled') {
      disabled = message.value;
      chrome.storage.local.set({ disabled: message.value });
    } else if (message.method === 'getSettings') {
      chrome.storage.local.get({ disabled: false }, reply);
    }
  };

  dev_tools_connection.onMessage.addListener(listener);
  dev_tools_connection.onDisconnect.addListener(function removeListener() {
    dev_tools_connection.onMessage.removeListener(listener);
    dev_tools_connection.onDisconnect.removeListener(removeListener);
  });

  chrome.storage.local.get({ disabled: false }, function (settings) {
    disabled = settings.disabled;
    dev_tools_connection.postMessage({ method: 'updateSettings', value: settings });
  });
});



chrome.webRequest.onBeforeRequest.addListener(function (details) {
  if (disabled) { return; }

  var detailJSON = overrides[details.url];
  if (detailJSON) {
    var detail = JSON.parse(detailJSON);
    return {
      redirectUrl: 'data:' + detail.mime + ';base64,' + btoa(detail.code)
    };
  }
}, {
  urls: ['<all_urls>']
}, [
  'blocking'
]);

var overrides = localStorage;
var disabled;

chrome.runtime.onConnect.addListener(function(dev_tools_connection) {
  var listener = function(message) {
    if (message.method === 'register') {
      overrides[message.url] = JSON.stringify(message.detail);
    } else if (message.method === 'release') {
      overrides.removeItem(message.url);
    } else if (message.method === 'set_disabled') {
      disabled = message.value;
      chrome.storage.local.set({disabled: message.value});
    }
  };

  dev_tools_connection.onMessage.addListener(listener);
  dev_tools_connection.onDisconnect.addListener(function remove_listener() {
    dev_tools_connection.onMessage.removeListener(listener);
    dev_tools_connection.onDisconnect.removeListener(remove_listener);
  });

  chrome.storage.local.get({disabled: false}, function(settings) {
    disabled = settings.disabled;
    dev_tools_connection.postMessage({method: 'update_settings', value: settings});
  });
});

chrome.webRequest.onBeforeRequest.addListener(function(details) {
  if (disabled) return;

  var detail_json = overrides[details.url];
  if (detail_json) {
    var detail = JSON.parse(detail_json);
    return {
      redirectUrl: 'data:' + detail.mime + ';base64,' + btoa(detail.code)
    };
  }
}, {
  urls: ['<all_urls>']
}, [
  'blocking'
]);

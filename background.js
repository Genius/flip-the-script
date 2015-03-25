var mocks = {}; // TODO move to storage?


chrome.runtime.onConnect.addListener(function (dev_tools_connection) {
  var listener = function (message) {
    if (message.method === 'register') {
      mocks[message.url] = message.content;
    } else if (message.method === 'release') {
      delete mocks[message.url];
    }
  };

  dev_tools_connection.onMessage.addListener(listener);
  dev_tools_connection.onDisconnect.addListener(function removeListener() {
    dev_tools_connection.onMessage.removeListener(listener);
    dev_tools_connection.onDisconnect.removeListener(removeListener);
  });
});



chrome.webRequest.onBeforeRequest.addListener(function (details) {
  var code = mocks[details.url];
  if (code) {
    return {
      redirectUrl: 'data:text/javascript;base64,' + btoa(code) // TODO
    };
  }
}, {
  urls: ['<all_urls>']
}, [
  'blocking'
]);

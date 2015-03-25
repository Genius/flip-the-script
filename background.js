var mocks = localStorage;


chrome.runtime.onConnect.addListener(function (dev_tools_connection) {
  var listener = function (message) {
    if (message.method === 'register') {
      mocks[message.url] = JSON.stringify(message.detail);
    } else if (message.method === 'release') {
      mocks.removeItem(message.url);
    }
  };

  dev_tools_connection.onMessage.addListener(listener);
  dev_tools_connection.onDisconnect.addListener(function removeListener() {
    dev_tools_connection.onMessage.removeListener(listener);
    dev_tools_connection.onDisconnect.removeListener(removeListener);
  });
});



chrome.webRequest.onBeforeRequest.addListener(function (details) {
  var detailJSON = mocks[details.url];
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

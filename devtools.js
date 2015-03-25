chrome.devtools.panels.create('Switch', null, 'panel.html', function (panel) {

  var panelWindow;
  var previousResource;

  var external = {
  };

  var onRequestFinishedHandler = function (request) {
    if (request.request.url.indexOf('data:text/genius') === 0) {
      previousResource.mocked = true;
      previousResource.mockedResource = request;
      panelWindow.external.addResource(previousResource);
    } else {
      panelWindow.external.addResource(request);
    }
    previousResource = request;
  };

  var onNavigatedHandler = function () {
    previousResource = undefined;
    panelWindow.external.resetResources();
  };

  panel.onShown.addListener(function (pw) {
    panelWindow = pw;
    panelWindow.tool = external;
    chrome.devtools.network.getHAR(function (log) {
      log.entries.forEach(function (request) {
        onRequestFinishedHandler(request);
      });
    });
    chrome.devtools.network.onRequestFinished.addListener(onRequestFinishedHandler);
    chrome.devtools.network.onNavigated.addListener(onNavigatedHandler);
  });

  panel.onHidden.addListener(function () {
    panelWindow = undefined;
    chrome.devtools.network.onRequestFinished.removeListener(onRequestFinishedHandler);
    chrome.devtools.network.onNavigated.removeListener(onNavigatedHandler);
  });

});

chrome.devtools.panels.create('Switch', null, 'panel.html', function (panel) {

  var panelWindow;
  var awaiting = {};

  var external = {
  };

  var onRequestFinishedHandler = function (request) {
    // If we receive a data-uri we're waiting for, assign it to it's
    // corresponding request, and then add that underlying request
    if (request.request.url.indexOf('data:') === 0) {
      var aw = awaiting[request.request.url];
      if (aw) {
        aw.overriddenRequest = request; // the data request
        aw.overridden = true;
        panelWindow.external.addRequest(aw);
        delete awaiting[request.request.url];
        return;
      }
    }

    // If we receive a redirect to a data-uri, add it to the awaiting table
    if (request.response.redirectURL.indexOf('data:') === 0) {
      awaiting[request.response.redirectURL] = request;
    } else {
    // If we receive a normal request, add it
      panelWindow.external.addRequest(request);
    }
  };

  var onNavigatedHandler = function () {
    panelWindow.external.resetRequests();
  };

  panel.onSearch.addListener(function (action, queryString) {
    if (action === 'performSearch') {
      panelWindow.external.setSearchTerm(queryString);
    } else if (action === 'cancelSearch') {
      panelWindow.external.setSearchTerm('');
    }
  });

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

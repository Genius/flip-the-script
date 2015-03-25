chrome.devtools.panels.create('Switch', null, 'panel.html', function(panel) {
  var panel_window;
  var awaiting = {};

  var on_request_finished_handler = function(request) {
    if (request.request.url.indexOf('data:') === 0) {
      var aw = awaiting[request.request.url];
      if (aw) {
        aw.overridden_request = request; // the data request
        aw.overridden = true;
        panel_window.external.add_request(aw);
        delete awaiting[request.request.url];
        return;
      }
    }

    if (request.response.redirectURL.indexOf('data:') === 0) {
      awaiting[request.response.redirectURL] = request;
    } else {
      panel_window.external.add_request(request);
    }
  };

  var on_navigated_handler = function() {
    panel_window.external.reset_requests();
  };

  panel.onSearch.addListener(function(action, query_string) {
    if (action === 'performSearch') {
      panel_window.external.set_search_term(query_string);
    } else if (action === 'cancelSearch') {
      panel_window.external.set_search_term('');
    }
  });

  panel.onShown.addListener(function(pw) {
    panel_window = pw;
    chrome.devtools.network.getHAR(function(log) {
      log.entries.forEach(function(request) {
        on_request_finished_handler(request);
      });
    });
    chrome.devtools.network.onRequestFinished.addListener(on_request_finished_handler);
    chrome.devtools.network.onNavigated.addListener(on_navigated_handler);
  });

  panel.onHidden.addListener(function() {
    panel_window = undefined;
    chrome.devtools.network.onRequestFinished.removeListener(on_request_finished_handler);
    chrome.devtools.network.onNavigated.removeListener(on_navigated_handler);
  });
});

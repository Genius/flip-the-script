/* global js_beautify,css_beautify */

var background_connection = chrome.extension.connect({
  name: 'panel'
});

angular.module('switch', ['ui.codemirror']);

angular.module('switch').filter('i18n', function() {

  return function(input) {
    return chrome.i18n.getMessage(input);
  };

});

angular.module('switch').controller('PanelCtrl', ['$scope', function($scope) {

  var mode_map = {
    'application/x-javascript': 'javascript',
    'application/javascript': 'javascript',
    'text/javascript': 'javascript',
    'application/json': 'javascript',
    'text/css': 'css'
  };

  $scope.disabled = false;
  background_connection.onMessage.addListener(function(message) {
    if (message.method === 'update_settings') {
      $scope.disabled = message.value.disabled;
      $scope.$apply();
    }
  });

  $scope.refresh_page = function() {
    chrome.devtools.inspectedWindow.reload();
    $scope.needs_refresh = false;
  };

  $scope.set_search_term = function(term) {
    $scope.search_term = term;
  };

  $scope.toggle_disabled = function(value) {
    $scope.disabled = value;
    background_connection.postMessage({
      method: 'set_disabled',
      value: value
    });
  };

  $scope.disable_override = function(request) {
    request.overridden = false;
    delete request.body;

    $scope.needs_refresh = true;

    if (request.overridden_request) {
      request.body = '/* Refresh the page for the original blocked response. */';
    }

    background_connection.postMessage({
      method: 'release',
      url: request.request.url
    });
  };

  $scope.overriden_count = function() {
    var count = 0;
    for (var mode in $scope.requests) {
      for (var i = 0; i < $scope.requests[mode].length; i++) {
        if ($scope.requests[mode][i].overridden) {
          count += 1;
        }
      }
    }
    return count;
  };

  $scope.disable_all_overrides = function() {
    for (var mode in $scope.requests) {
      for (var i = 0; i < $scope.requests[mode].length; i++) {
        if ($scope.requests[mode][i].overridden) {
          $scope.disable_override($scope.requests[mode][i]);
        }
      }
    }
  };

  $scope.add_request = function(request) {
    if ($scope.disabled) { return; }
    var underlying_request = request.overridden_request || request;
    request.mode = mode_map[underlying_request.response.content.mimeType];
    request.mime = underlying_request.response.content.mimeType;
    if (request.mode) {
      $scope.just_opened = false;
      $scope.requests[request.mode] = $scope.requests[request.mode] || [];
      $scope.requests[request.mode].push(request);
    }
  };

  $scope.reset_requests = function() {
    $scope.cancel_saving();
    $scope.requests = {};
    if ($scope.disabled) {
      $scope.just_opened = true;
    }
  };

  $scope.select_request = function(request) {
    $scope.selected_request = request;
    if ($scope.selected_request.body) {
      $scope.editor.body = $scope.selected_request.body;
    } else {
      (request.overridden_request || request).getContent(function(content) {
        $scope.editor.body = content;
        $scope.$apply();
      });
    }
  };

  $scope.is_beautifiable = function() {
    return ['css', 'javascript'].indexOf($scope.selected_request.mode) !== -1;
  };

  $scope.beautify_selected = function() {
    var editor = $scope.editor;
    switch($scope.selected_request.mode) {
      case 'javascript': editor.body = js_beautify(editor.body); break;
      case 'css':        editor.body = css_beautify(editor.body); break;
    }
  };

  $scope.cancel_saving = function() {
    $scope.editor = {};
    $scope.selected_request = undefined;
  };

  $scope.save_selected_request = function() {
    $scope.selected_request.overridden = true;
    $scope.selected_request.body = $scope.editor.body;
    $scope.needs_refresh = true;
    background_connection.postMessage({
      method: 'register',
      url: $scope.selected_request.request.url,
      detail: {
        code: $scope.editor.body,
        mime: $scope.selected_request.mime
      }
    });
    $scope.cancel_saving();
  };

  $scope.editor_options = function() {
    return {
      mode: $scope.selected_request ? $scope.selected_request.mode : undefined,
      lineNumbers: true,
      styleActiveLine: true
    };
  };

  $scope.needs_refresh = false;
  $scope.just_opened = true;
  $scope.editor = {};
  $scope.reset_requests();

  // export a few methods in a convenient way
  window.external = {};
  ['add_request', 'reset_requests', 'set_search_term'].forEach(function(name) {
    window.external[name] = function() {
      var args = Array.prototype.slice.call(arguments);
      $scope.$apply(function() {
        $scope[name].apply($scope, args);
      });
    };
  });

}]);

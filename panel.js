/* global tool,js_beautify,css_beautify */

var background_connection = chrome.extension.connect({
  name: 'panel'
});

angular.module('switch', ['ui.codemirror']);

angular.module('switch').filter('i18n', function () {

  return function (input) {
    return chrome.i18n.getMessage(input);
  };

});

angular.module('switch').controller('PanelCtrl', ['$scope', function ($scope) {

  var mode_map = {
    'application/x-javascript': 'javascript',
    'application/javascript': 'javascript',
    'text/javascript': 'javascript',
    'application/json': 'javascript',
    'text/css': 'css'
  };

  $scope.disabled = false;
  background_connection.onMessage.addListener(function (message) {
    if (message.method === 'updateSettings') {
      $scope.disabled = message.value.disabled;
      $scope.$apply();
    }
  });

  $scope.setSearchTerm = function (term) {
    $scope.searchTerm = term;
  };

  $scope.toggleDisabled = function (value) {
    $scope.disabled = value;
    $scope.just_opened = true;
    background_connection.postMessage({
      method: 'setDisabled',
      value: value
    });
  };

  $scope.unmock = function (request) {
    request.mocked = false;
    delete request.body;

    if (request.mockedRequest) {
      request.body = '/* Refresh the page for the original blocked response. */';
    }

    background_connection.postMessage({
      method: 'release',
      url: request.request.url
    });
  };

  $scope.mockedCount = function () {
    var count = 0;
    for (var mode in $scope.requests) {
      for (var i = 0; i < $scope.requests[mode].length; i++) {
        if ($scope.requests[mode][i].mocked) {
          count += 1;
        }
      }
    }
    return count;
  };

  $scope.unmockAll = function () {
    for (var mode in $scope.requests) {
      for (var i = 0; i < $scope.requests[mode].length; i++) {
        if ($scope.requests[mode][i].mocked) {
          $scope.unmock($scope.requests[mode][i]);
        }
      }
    }
  };

  $scope.addRequest = function (request) {
    var underlying_request = request.mockedRequest || request;
    request.mode = mode_map[underlying_request.response.content.mimeType];
    request.mime = underlying_request.response.content.mimeType;
    if (request.mode) {
      $scope.just_opened = false;
      $scope.requests[request.mode] = $scope.requests[request.mode] || [];
      $scope.requests[request.mode].push(request);
    }
  };

  $scope.resetRequests = function () {
    $scope.cancelSaving();
    $scope.requests = {};
  };

  $scope.selectRequest = function (request) {
    $scope.selectedRequest = request;
    if ($scope.selectedRequest.body) {
      $scope.editor.body = $scope.selectedRequest.body;
    } else {
      (request.mockedRequest || request).getContent(function (content) {
        $scope.editor.body = content;
        $scope.$apply();
      });
    }
  };

  $scope.is_beautifiable = function () {
    return ['css', 'javascript'].indexOf($scope.selectedRequest.mode) !== -1;
  };

  $scope.beautifySelected = function () {
    var editor = $scope.editor;
    switch($scope.selectedRequest.mode) {
      case 'javascript': editor.body = js_beautify(editor.body); break;
      case 'css':        editor.body = css_beautify(editor.body); break;
    }
  };

  $scope.cancelSaving = function () {
    $scope.editor = {};
    $scope.selectedRequest = undefined;
  };

  $scope.saveSelectedRequest = function () {
    $scope.selectedRequest.mocked = true;
    $scope.selectedRequest.body = $scope.editor.body;
    background_connection.postMessage({
      method: 'register',
      url: $scope.selectedRequest.request.url,
      detail: {
        code: $scope.editor.body,
        mime: $scope.selectedRequest.mime
      }
    });
    $scope.cancelSaving();
  };

  $scope.editorOptions = function () {
    return {
      mode: $scope.selectedRequest ? $scope.selectedRequest.mode : undefined,
      lineNumbers: true,
      styleActiveLine: true
    };
  };

  $scope.just_opened = true;
  $scope.editor = {};
  $scope.resetRequests();

  // export a few methods in a convenient way
  window.external = {};
  ['addRequest', 'resetRequests', 'setSearchTerm'].forEach(function (name) {
    window.external[name] = function () {
      var args = Array.prototype.slice.call(arguments);
      $scope.$apply(function () {
        $scope[name].apply($scope, args);
      });
    };
  });

}]);

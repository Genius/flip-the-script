/* global tool,js_beautify,css_beautify */

var background_connection = chrome.extension.connect({
  name: 'panel'
});

angular.module('switch', ['ui.codemirror']);

angular.module('switch').controller('PanelCtrl', ['$scope', function ($scope) {

  var mode_map = {
    'application/x-javascript': 'javascript',
    'application/javascript': 'javascript',
    'text/javascript': 'javascript',
    'application/json': 'javascript',
    'text/css': 'css'
  };

  $scope.editor = {};
  $scope.resources = [];

  $scope.addResource = function (request) {
    var underlying_request = request.mockedResource || request;
    request.mode = mode_map[underlying_request.response.content.mimeType];
    if (request.mode) {
      $scope.resources.push(request);
    }
  };

  $scope.resetResources = function () {
    $scope.cancelSaving();
    $scope.resources = [];
  };

  $scope.selectResource = function (resource) {
    $scope.selectedResource = resource;
    if ($scope.selectedResource.body) {
      $scope.editor.body = $scope.selectedResource.body;
    } else {
      (resource.mockedResource || resource).getContent(function (content) {
        $scope.editor.body = content;
        $scope.$apply();
      });
    }
  };

  $scope.unmockSelected = function () {
    $scope.selectedResource.mocked = false;
    delete $scope.selectedResource.body;

    if ($scope.selectedResource.mockedResource) {
      $scope.selectedResource.body = '/* Refresh the page for the original blocked response. */';
    }

    background_connection.postMessage({
      method: 'release',
      url: $scope.selectedResource.request.url
    });
    $scope.cancelSaving();
  };

  $scope.is_beautifiable = function () {
    return ['css', 'javascript'].indexOf($scope.selectedResource.mode) !== -1;
  };

  $scope.beautifySelected = function () {
    var editor = $scope.editor;
    switch($scope.selectedResource.mode) {
      case 'javascript': editor.body = js_beautify(editor.body); break;
      case 'css':        editor.body = css_beautify(editor.body); break;
    }
  };

  $scope.cancelSaving = function () {
    $scope.editor = {};
    $scope.selectedResource = undefined;
  };

  $scope.saveSelectedResource = function () {
    $scope.selectedResource.mocked = true;
    $scope.selectedResource.body = $scope.editor.body;
    background_connection.postMessage({
      method: 'register',
      url: $scope.selectedResource.request.url,
      content: $scope.editor.body
    });
    $scope.cancelSaving();
  };

  $scope.editorOptions = function () {
    return {
      mode: $scope.selectedResource ? $scope.selectedResource.mode : undefined,
      lineNumbers: true,
      styleActiveLine: true
    };
  };

  $scope.resetResources();

  // export a few methods in a convenient way
  window.external = {};
  ['addResource', 'resetResources'].forEach(function (name) {
    window.external[name] = function () {
      var args = Array.prototype.slice.call(arguments);
      $scope.$apply(function () {
        $scope[name].apply($scope, args);
      });
    };
  });

}]);

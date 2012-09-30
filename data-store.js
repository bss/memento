(function (exports) {


  exports.timefilter = timefilter;

  function timefilter() {
    var cfData = [],
      cf = crossfilter(),
      cfDimensions = {},
      cfFilters = {},
      dispatcher = d3.dispatch("dataChanged"),
      preprocessorCB;

    var self = {
      data: data,
      addDimension: addDimension,
      filterDimension: filterDimension,
      filteredData: filteredData,
      resultObserver: resultObserver,
      preprocessor: preprocessor,
      forceUpdate: forceUpdate,
      appendData: appendData
    };

    function preprocessor(_) {
      if (!arguments.length) return preprocessorCB;
      preprocessorCB = _;
      return self;
    }

    function data(_) {
      if (!arguments.length) return cfData;
      cfData = _;
      if (typeof(preprocessorCB) !== "undefined") cfData = preprocessorCB(cfData);
      cf.add(cfData);
      dispatcher.dataChanged();
      return self;
    }

    function appendData(_) {
      return self.data(cfData.concat(_));
    }

    function addDimension(name, handler) {
      cfDimensions[name] = cf.dimension(handler);
      return self;
    }
    function filterDimension(name, _) {
      if (!arguments.length) return;
      if (arguments.length === 1) return cfFilters[name];
      if (typeof(cfDimensions[name]) != "undefined") {
        if (_ !== null) {
          cfFilters[name] = _;
          cfDimensions[name].filter( cfFilters[name] );
        } else {
          delete(cfFilters[name]);
          cfDimensions[name].filterAll();
        }
        dispatcher.dataChanged();
      }
      return self;
    }
    function filteredData() {
      var keys = Object.keys(cfDimensions);
      if (keys.length > 0) {
        return cfDimensions[keys[0]].top(1000000000).reverse();
      }
      return cf.dimension(Object).top(1000000000).reverse();
    }

    function forceUpdate() {
      dispatcher.dataChanged();
    }

    var resultObservers = {};
    var i =0;
    function resultObserver(identifier) {
      var callbacks = [],
          reduce = function (data) { return data; },
          cachedResult = null;
      identifier = identifier;

      if (typeof(resultObservers[identifier]) == "undefined") {
        resultObservers[identifier] = {
          index: ++i,
          addCallback: addCallback,
          reducer: reducer,
          result: result
        };
        dispatcher.on("dataChanged."+identifier, function () {
          notifyObservers();
        });
      }

      function reducer(_) {
        if (!arguments.length) return reduce;
        reduce = _;
        notifyObservers();
        return resultObservers[identifier];
      }

      function addCallback(cb) {
        callbacks.push(cb);
        return resultObservers[identifier];
      }

      function result(force) {
        if (!arguments.length) force = false;
        if (force || !cachedResult) {
          cachedResult = reduce(filteredData());
        }
        return cachedResult;
      }

      function notifyObservers() {
        var res = result(true);
        callbacks.forEach(function (cb) {
          cb(res);
        });
      }

      return resultObservers[identifier];
    }
    return self;
  }

})(this);
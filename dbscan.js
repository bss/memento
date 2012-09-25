(function (exports) {
  exports.dbscan = dbscan;

  function dbscan() {
    var self = {},
      epsilon,
      minSize,
      key,
      distance = function (a,b) { return 0; },
      data = [],
      assigned = {},
      clusters = [];

    self.key  = function (_) {
      if (!arguments.length) return key;
      key = _;
      return self;
    };

    self.distance  = function (_) {
      if (!arguments.length) return distance;
      distance = _;
      return self;
    };

    self.epsilon  = function (_) {
      if (!arguments.length) return epsilon;
      epsilon = d3.functor(_);
      return self;
    };

    self.minSize = function (_) {
      if (!arguments.length) return minSize;
      minSize = _;
      return self;
    };

    self.data = function (_) {
      if (!arguments.length) return data;
      data = _;
      return self;
    };

    self.run = function () {
      assigned = {};
      clusters = [];
      data.forEach(function (d, _) {
        id = key(d);
        if ( !(id in assigned)) {  // Only go through unvisited points
          assigned[id] = 1; // Marks as visited
          var neighbours = findNeighbours(d);
          if ( neighbours.length < minSize) {
                assigned[id] = -1; // Mark as noise
            } else {
            var clusterIdx = clusters.length; // Next cluster index
            clusters[clusterIdx] = [];  // new cluster
            expandCluster(d, neighbours, clusterIdx);
          }
        }
      });
      return clusters;
    };

    function findNeighbours(d) {
      var neighbours = [];
      data.forEach(function (n, _) {
        if ( key(n) != key(d) ) {
          if (distance(d, n) <= epsilon(d, n)) {
            neighbours.push(n);
          }
        }
      });
      return neighbours;
    }

    function expandCluster(d, neighbours, clusterIdx) {
      clusters[clusterIdx].push(d);
      assigned[key(d)] = clusterIdx;
      neighbours.forEach(function (n, i) {
        if ( !(key(n) in assigned)) {  // n not yet visited?
          var localNeighbours = findNeighbours(n);  // NP is neighbours'
          if (localNeighbours.length >= minSize) {
            //neighbours = neighbours.concat(localNeighbours);
            expandCluster(n, localNeighbours, clusterIdx);
          }
        }
        if (assigned[key(n)] === -1) {  // n not yet assigned to a cluster?
          clusters[clusterIdx].push(n);
          assigned[key(n)] = clusterIdx;
        }
      });
    }

    return self;
  }
})(this);
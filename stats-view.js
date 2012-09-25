
function StatsView() {
  if (!StatsView.id) StatsView.id = 0;

  var id = StatsView.id++;

  // Properties
  var width = 400,
      height = 400,
      data;


  function view(container) {
      var binnedLocationData = binLocationData(data.locations);
      
      var movementFormat = d3.format(".2f");
      var movementDay = 0,
          movementWeek = 0,
          movementAlltime = d3.sum(d3.values(binnedLocationData));

      if (data.today && typeof(binnedLocationData[d3.time.day(data.today).getTime()]) != "undefined") movementDay = binnedLocationData[d3.time.day(data.today).getTime()];

      if (data.today) {
        movementWeek = d3.sum(d3.entries(binnedLocationData), function (d) {
          if ( d3.time.monday(new Date(parseInt(d.key, 10))).getTime() == d3.time.monday(data.today).getTime()) {
            return d.value;
          }
          return 0;
        });
      }

      d3.select('#stats-today-movement').html(movementFormat(movementDay)+" km");
      d3.select('#stats-week-movement').html(movementFormat(movementWeek)+" km");
      d3.select('#stats-alltime-movement').html(movementFormat(movementAlltime)+" km");


      var binnedConnectionData = d3.entries(binConnectionData(data.connections))
        .filter(function (d) { return (d.key.split(":")[0] == data.currentUser); });
      
      var mapNestedData = function (nestedData, key) {
        return nestedData.reduce (function (a, b) {
          b.value.forEach(function (d) {
            if (typeof(a[key(d)]) == "undefined") a[key(d)] = [];
            if (a[key(d)].indexOf(d.to) === -1) a[key(d)].push(d.to);
          });
          return a;
        }, {});
      };

      var daysMap = mapNestedData(binnedConnectionData, function (d) { return d3.time.day(d.date).getTime(); });
      var weeksMap = mapNestedData(binnedConnectionData, function (d) { return d3.time.monday(d.date).getTime(); });

      var connectionsDay = 0; 
        connectionsWeek = 0;
        connectionsAlltime = binnedConnectionData.length;
      if (data.today && typeof(daysMap[d3.time.day(data.today).getTime()]) != "undefined") connectionsDay = daysMap[d3.time.day(data.today).getTime()].length;
      if (data.today && typeof(weeksMap[d3.time.monday(data.today).getTime()]) != "undefined") connectionsWeek = weeksMap[d3.time.monday(data.today).getTime()].length;
      
      d3.select('#stats-today-connections').html(connectionsDay);
      d3.select('#stats-week-connections').html(connectionsWeek);
      d3.select('#stats-alltime-connections').html(connectionsAlltime);
  }

  // Plain old getters and setters
  view.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return view;
  };
  view.height = function(_) {
    if (!arguments.length) return height;
    height = _;
    return view;
  };
  view.data = function (_) {
    if (!arguments.length) return data;
    data = _;
    return view;
  };

  return view;

  function binLocationData(data) {
    if (data.length > 0) {
      var nestedLocations = d3.nest()
        .key(function (d) { return d3.time.day(d.date).getTime(); })
        .entries(data);
      return nestedLocations.reduce (function (a,b) {
        a[b.key] = b.values.reduce( function (distanceSum, a, i, arr) {
          if ( (i+1) < arr.length) {
            var b = arr[i+1];
            return distanceSum+d3.geo.distance( [a.location.latitude, a.location.longitude], 
                                                [b.location.latitude, b.location.longitude]);
          }
          return distanceSum;
        }, 0.0);
        return a;
      }, {});
    }
    return {};
  }

  function binConnectionData(data) {
    if (data.length > 0) {
      // Nest links in two nestings first by hour, then by source and target.
      var nestedLinks = d3.nest()
        .key(function (d) { return d3.time.hour(d.date).getTime(); })
        .key(function (d) { return ""+d.from+":"+d.to;  })
        .map(data);

      // Map and reduce the links to contain only 1 entry pr. hour pr. source/target pair
      data = d3.entries( nestedLinks )
        .filter(function (d) {return d3.entries(d.value).length > 1;})
        .map(function (toFrom) {
          var entries = d3.entries(toFrom.value).filter(function (d) {
            return (typeof(toFrom.value[""+d.value[0].to+":"+d.value[0].from]) != "undefined");
          }).map(function (vals) {
            return vals.value;
          });
          if (entries.length > 0) entries = entries.reduce(function (a,b) { return a.concat(b); });
          return entries;
        })
        .filter(function (d) { return d.length>0;});
      
      if (data.length > 0) {
        data = data.reduce(function (a,b) { return a.concat(b); });
      }
  
      // Nest reduced links and count each occurence of a source/target pair
      data = d3.nest()
        .key(function (d) { return ""+d.from+":"+d.to;  })
        .map(data);
      
    }
    return data;
  }

}
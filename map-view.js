
var po = org.polymaps;

var selectedGroup = null,
  playbackOn = false;

var mapSvg = po.svg("svg");
mapSvg.setAttribute('width', '100%');
mapSvg.setAttribute('height', '100%');

var map = po.map()
  .container(document.getElementById("map").appendChild(mapSvg))
  .add(po.interact())
  .add(po.hash());

  //
var mapTiles = po.image().id("map-tiles");
map.add(mapTiles);



var currentMap = "",
  mapStyles = {};
initDefaultMap();
changeMap("default");

function mapStyleToggle() {
  changeMap((currentMap == "default") ? "aerial" : "default");
}

function changeMap(name) {
  if (typeof(mapStyles[name]) != "undefined") {
    currentMap = name;
    mapTiles.url(mapStyles[name].url);
    map.tileSize(mapStyles[name].tileSize);
    map.zoomRange(mapStyles[name].zoomRange || [1, 18]);
  }
}

function initDefaultMap() {
  mapStyles["default"] = {url: po.url("http://{S}tile.cloudmade.com" + 
      "/a8ec34dadb4644529a687a551f184b10" + 
      "/64935/256/{Z}/{X}/{Y}.png")
      .hosts(["a.", "b.", "c."]), 
              tileSize: {x: 256, y: 256}};
}

function initAerialMap(data) {
  var resourceSets = data.resourceSets;
  for (var i = 0; i < resourceSets.length; i++) {
    var resources = data.resourceSets[i].resources;
    for (var j = 0; j < resources.length; j++) {
      var resource = resources[j];
      mapStyles.aerial = {};
      mapStyles.aerial.url = template(resource.imageUrl, resource.imageUrlSubdomains);
      mapStyles.aerial.tileSize = {x: resource.imageWidth, y: resource.imageHeight};
      mapStyles.aerial.zoomRange = [resource.zoomMin, 20]; // Set manually as zoom level 21 is not supported in denmark

    }
  }
}
 
var script = document.createElement("script");
script.setAttribute("type", "text/javascript");
script.setAttribute("src", "//dev.virtualearth.net" + 
  "/REST/V1/Imagery/Metadata/AerialWithLabels" + 
  "?key=AjZ-czlh9M4J7LLO_ZTm7w3YU7sYtG-roJn7gK8GfY2Gx3v8A1Gyy4Xkg8GIPwE3" + 
  "&jsonp=initAerialMap");
document.body.appendChild(script);

/** Returns a Bing URL template given a string and a list of subdomains. */
function template(url, subdomains) {
  var n = subdomains.length,
      salt = ~~(Math.random() * n); // per-session salt

  /** Returns the given coordinate formatted as a 'quadkey'. */
  function quad(column, row, zoom) {
    var key = "";
    for (var i = 1; i <= zoom; i++) {
      key += (((row >> zoom - i) & 1) << 1) | ((column >> zoom - i) & 1);
    }
    return key;
  }

  return function(c) {
    var quadKey = quad(c.column, c.row, c.zoom),
        server = Math.abs(salt + c.column + c.row + c.zoom) % n;
    return url
        .replace("{quadkey}", quadKey)
        .replace("{subdomain}", subdomains[server]);
  };
}

d3.select("a.zoom-control.zoom-in").on("click", function () {
  d3.event.preventDefault();
  map.zoom(Math.round(map.zoom()+1));
});
d3.select("a.zoom-control.zoom-out").on("click", function () {
  d3.event.preventDefault();
  map.zoom(Math.round(map.zoom()-1));
});

var circleColor = d3.scale.category10();
  
var area = d3.scale.pow().exponent(0.5).domain([0, 24*60*60*1000]).range([150, 2500]);

var initialData = true;

var pointLayer = geoMapper()
  .on("change", function (data) {
    if (initialData && data.length > 0) {
      var extentMargin = {top: 0.0, left: 0.0, right: 0.0, bottom: 0.0 };
      map.extent(  [
        { lat: d3.min(data, function (d) { return d.location.latitude; })-extentMargin.bottom, 
          lon: d3.min(data, function (d) { return d.location.longitude; })-extentMargin.left}, 
        { lat: d3.max(data, function (d) { return d.location.latitude; })+extentMargin.top, 
          lon: d3.max(data, function (d) { return d.location.longitude; })+extentMargin.right}]);
      
      map.zoom(Math.floor(map.zoom()));
      initialData = false;
    }
  });

map.add(pointLayer.id("points"));

function geoMapper() {

  var data = [];

  // Create the base layer object, using our tile factory.
  var layer = po.layer(load)
    .tile(false);

  var dispatcher = d3.dispatch("change", "pointClick");

  // Custom tile implementation.
  function load(tile, projection) {

    projection = projection(tile).locationPoint;
  
    var layerContainer = d3.select(tile.element = po.svg("g"));
    
    var lines = generateLines(data);

    layerContainer.selectAll("line.fade-line")
      .data(lines)
    .enter().append("svg:line")
      .classed("fade-line", true);


    var lineOpacityScale = d3.scale.pow().exponent(0.5)
      .domain([lines.length-10, lines.length-1])
      .range([0, 1])
      .clamp(true);

    var lineWidthScale = d3.scale.pow().exponent(0.5)
      .domain([lines.length-10, lines.length-1])
      .range([0, 5])
      .clamp(true);

    layerContainer.selectAll("line")
      .attr("x1", function (d) { return d.x1; })
      .attr("y1", function (d) { return d.y1; })
      .attr("x2", function (d) { return d.x2; })
      .attr("y2", function (d) { return d.y2; })
      .style("stroke", "#973C41") //#fd8d3c
      .style("stroke-width", function (_,i) { return lineWidthScale(i); })
      .style("opacity", function (_, i) { return lineOpacityScale(i); });


    // Add an svg:g for each circle.
    var g = layerContainer.selectAll("g")
      .data(data)
    .enter().append("svg:g")
      .attr("transform", transform);

    circleRadius = function(d) { 
      var duration = (typeof(d.events) != "undefined") ? d.events[d.events.length-1].date.getTime()-d.events[0].date.getTime() : 0;
      return Math.sqrt(area(duration)/Math.PI);
      //return (typeof(d.events) != "undefined") ? Math.sqrt(area(d.events.length)/Math.PI) : 5; 
    };

    // Add a circle.
    g.append("svg:circle")
      .classed("point", true)
      .classed("intensity-high", true)
      //.classed("intensity-high", function (d) { return d.intensityClass >= 0.8})
      //.classed("intensity-medium", function (d) { return d.intensityClass > 0.4 && d.intensityClass < 0.8})
      //.classed("intensity-low", function (d) { return d.intensityClass <= 0.4})
      .attr("data-uid", function (d) { return (d.type == "person") ? d.events[0].extra_info.uid : false; })
      .attr("data-count", function (d) { return d.events.length; })
      .attr("data-group", function (d) { return d.group; })
      .attr("data-type", function (d) { return d.type; })
      .attr("data-cluster", function (d) { return d.cluster; })
      .attr("r", circleRadius)
      //.style("fill", function (d) { return circleColor(d.group); })
      .style("fill", "#E11721") // #8ca252 ...  #E6B817
      .on("click", function (d) {
        dispatcher.pointClick(d);
      });
    
    
    var lastG = layerContainer.selectAll("g:last-child")
      .insert("svg:circle")
      .classed("pulse", true)
      .attr("r", function (d) { return circleRadius(d)*1.5; })
      .style("fill", "none")
      .style("stroke", "black")
      .style("stroke-opacity", "0.3")
      .style("stroke-width", "2")
      .style("stroke-dasharray", "10,10");
    if (!playbackOn) {
      lastG.append("svg:animate")
        .attr('attributeName', "r")
        .attr('from', function (d) { return circleRadius(d); })
        .attr('to', function (d) { return circleRadius(d)*2; })
        .attr('dur', '1.5s')
        .attr('repeatCount', 'indefinite');
    }
    

    function transform(d, i) {
      pos = projection({lon: d.location.longitude, lat: d.location.latitude});
      return "translate(" + pos.x + "," + pos.y + ")";
    }

    function generateLines(points) {
      var lines = [];
      var lastPoint = {};
      points.forEach( function (d,i) {
        var pos = projection({lon: d.location.longitude, lat: d.location.latitude});
        if (typeof(lastPoint[d.group]) != "undefined") {
          lines.push({x1: lastPoint[d.group].x, y1: lastPoint[d.group].y, x2: pos.x, y2: pos.y});
        }
        lastPoint[d.group] = pos;
      });
      return lines;
    }

  }
  
  layer.data = function (_) {

    data = clusterLocations(_);
    /*
    // Used when clustering is disable to ensure correct output format.
    data = _.map(function (d) {
      return {cluster: 0, 
              group: d.extra_info.uid, 
              uid: d.extra_info.uid, 
              location: d.location,
              events: [d]};
    });*/
    layer.reload();
    dispatcher.change(data);
    return layer;
  };

  function clusterLocations(data) {
    
    var dist = function (a,b) {  
      if (a.group != b.group) {
        return Infinity;
      }

      var timeDiff = a.date.getTime()/1000 - b.date.getTime()/1000;
      if (timeDiff > 1800 || timeDiff < -1800) {
        return Infinity;
      }
      return d3.geo.distance( [a.location.latitude, a.location.longitude], 
                              [b.location.latitude, b.location.longitude]);
    };

    var cluster = layer.cluster || (layer.cluster = dbscan()
      .epsilon(0.1)
      .minSize(0)
      .key(function (d) { return d.index; })
      .distance(dist)
      );

/*
    // K-means clustering
    var cluster = layer.cluster || (layer.cluster = kmeans()
      .size(4)
      .iterations(100)
      .key(function (d) { return d.index; })
      .x(function (d, obj) { 
        if (arguments.length == 2) {
          if(typeof(obj.location) == "undefined") obj.location = {};
          obj.location.latitude = d.location.latitude;
          return obj; 
        } else {
          return d.location.latitude;
        }
      })
      .y(function (d, obj) { 
        if (arguments.length == 2) {
          if(typeof(obj.location) == "undefined") obj.location = {};
          obj.location.longitude = d.location.longitude;
          return obj; 
        } else {
          return d.location.longitude;
        }
      })
      .distance(dist)
      )
*/

    var result = [];
    var splitter = 300;
    d3.range(data.length/splitter).forEach(function (i) {
      var dataSlice = data.slice(i*splitter, (i+1)*splitter);
      var points = cluster.data(dataSlice).run();
      points.forEach(function (p) {
        result.push(p);
      });
    });
    
    result = result.map(function (events, clusterIdx) {
      var cluster = {};
      cluster.cluster = clusterIdx;
      cluster.events = events.sort(function (a,b) { return d3.ascending(a.date, b.date); });
      cluster.location = {};
      cluster.location.accuracy = d3.max(cluster.events, function (d) { return d.location.accuracy; });
      cluster.location.latitude = d3.mean(cluster.events, function (d) { return d.location.latitude; });
      cluster.location.longitude = d3.mean(cluster.events, function (d) { return d.location.longitude; });
      cluster.uid = cluster.events[0].extra_info.uid;
      cluster.group = cluster.events[0].extra_info.uid;
      return cluster;
    });
    return result.sort(function (a,b) { return d3.ascending(a.events[0].date, b.events[0].date); });
  }

  return d3.rebind(layer, dispatcher, "on");
}
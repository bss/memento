
function InfoView() {
  if (!InfoView.id) InfoView.id = 0;

  var id = InfoView.id++;

  // Properties
  var data;

  function view(container) {

    if (container.selectAll('*').empty()) {
      container.append('a')
        .attr('href', '#')
        .classed('close-splash', true)
        .classed('btn-close-panel', true)
        .append('i')
          .classed('icon-remove-circle', true);

      container.append('h2').text('Location');

      var locInfoContainer = container
        .append('p');

      locInfoContainer.append('strong')
        .text('Time: ');
      locInfoContainer.append('span')
        .classed('location-info-from-to', true);

      locInfoContainer.append('br');
      locInfoContainer.append('strong')
        .text('Duration: ');
      locInfoContainer.append('span')
        .classed('location-info-duration', true);


      locInfoContainer.append('h2')
        .text('Connections');

      locInfoContainer.append('div')
        .classed('connections-overview', true);

      container.append('p')
        .append('a')
          .attr('href', '#')
          .classed('close-splash', true)
          .text("Close");

    }

    var dateFormat = d3.time.format('%H:%M');

    var events = data.location.events,
        duration = events[events.length-1].date.getTime()-events[0].date.getTime();
    container.selectAll('.location-info-from-to').text(""+dateFormat(events[0].date)+" - "+dateFormat(events[events.length-1].date));
    container.selectAll('.location-info-duration').text(durationFormat(duration/1000));

    container.selectAll('.close-splash')
      .on('click', function () {
        container.classed('open', false);
      });

    container.classed('open', true);

    if (data.connections.length) {
      d3.select(".connections-overview").call(setupViz);
    } else {
      d3.select(".connections-overview").text("No connections were made.");
    }
  }

  view.data = function (_) {
    if (!arguments.length) return data;
    data = _;
    return view;
  };

  return view;

  function durationFormat(seconds) {
    var times = [{ singular: "day", plural: "days", divider: 864e2},
                 { singular: "hour", plural: "hours", divider: 3600},
                 { singular: "minute", plural: "minutes", divider: 60},
                 { singular: "second", plural: "seconds", divider: 1}];
    
    return times.reduce(function (a, t) {
      var result = Math.floor(seconds/t.divider);
      if (result || t.divider === 1) {
        seconds -= result*t.divider;
        return a+" "+result+" "+( (result === 1) ? t.singular : t.plural );
      }
      return a;
    }, "").slice(1);
  }

  function setupViz(g) {

    data.connections.forEach(function (d) {
      d.scaleKey = (d3.time.hour(d.date).getTime()-d3.time.day(d.date).getTime())/1000/60/60;
    });

    var distinctDevices = d3.entries(d3.nest()
      .key(function (d) { return d.mac_address; })
      .key(function (d) { return d3.time.hour(d.date).getTime(); })
      .rollup(function (values) { values[0].count = values.length; return values[0]; })
      .map(data.connections))
    .map(function (d) {
      return d3.values(d.value);
    });

    distinctDevices.sort(function (a,b) { 
      var sumFunc = function (d) { return d.count; };
      return d3.descending(d3.sum(a, sumFunc), d3.sum(b, sumFunc)); 
    });

    var xAxisDomain = d3.range(0, 24).map(function (i) { return ""+i; });

    var axisHeight = 30,
      axisWidth = 175,
      columnWidth = 15,
      columnHeight = 15,
      width = axisWidth+xAxisDomain.length*columnWidth, // should be 600 at max
      height = 2*axisHeight+distinctDevices.length*columnHeight;

    var countMax = d3.max(data.connections, function (d) { return d.count; }),
      xMin = d3.min(data.connections, function (d) { return d.scaleKey; }),
      xMax = d3.max(data.connections, function (d) { return d.scaleKey; }),
      //xScale = d3.time.scale().domain([xMin, xMax]).range([axisWidth, width-axisWidth]),
      xScale = d3.scale.ordinal().domain(xAxisDomain).rangeBands([axisWidth, width]),
      yScale = d3.scale.ordinal().domain(distinctDevices.map(function (d) { return d[0].mac_address; })).rangeBands([axisHeight, height-axisHeight]),
      circleScale = d3.scale.pow().exponent(2).domain([0, countMax]).range([4, 10]).clamp(true);

    var svg = g.html("")
      .append("svg")
        .attr("width", width+20)
        .attr("height", height)
        .append("g")
          .attr("transform", "translate(15, 15)");

    var xAxis = function (position, scale) {
      /*var ticksData = [d3.time.day(scale.domain()[0]),
              d3.time.day.round(scale.invert( scale.range()[0]+((scale.range()[1]-scale.range()[0])*.5) )),
              d3.time.day(scale.domain()[1])], */
          var ticksData = scale.domain().filter(function (d,i) { return ( i % 3 === 0);});

          return function (g) {
        var ticks = g.selectAll("g.axis-tick")
          .data(ticksData);
        
        ticks.enter()
          .append("svg:g")
            .classed("axis-tick", true)
            .attr("transform", function (d) { return "translate("+scale(d)+", 0)"; })
          .append("svg:text")
            .attr("text-anchor", "middle")
            .attr("dy", function() { return (position == "bottom") ?  ".75em" : "0em"; })
            .text(function (d, i) { return d; });

        g.append("line")
          .attr("y1", function() { return (position == "bottom") ?  -5 : 5; })
          .attr("y2", function() { return (position == "bottom") ?  -5 : 5; })
          .attr("x1", scale.range()[0])
          .attr("x2", scale.range()[scale.range().length-1])
          .style("stroke", "black");

      };
    };
    var xAxisTop = xAxis("top", xScale);

    //var xAxisTop = d3.svg.axis().scale(xScale).orient("top").ticks(distinctDays.length);
    svg.append("g")
      .attr("transform", "translate(0, 0)")
      .call(xAxisTop);

    //var xAxisBottom = d3.svg.axis().scale(xScale).orient("bottom").ticks(distinctDays.length)
    var xAxisBottom = xAxis("bottom", xScale);

    svg.append("g")
      .attr("transform", "translate(0, "+(height-axisHeight)+")")
      .call(xAxisBottom);

    var tickValues = distinctDevices.map(
        function (d) {
          var key = d[0].mac_address,
              name = key;
          if (typeof(data.nodes[d[0].to]) !== "undefined" && data.nodes[d[0].to].name !== "") {
            name = data.nodes[d[0].to].name;
          }
          return {'key': key, 'value': name};
        }
      );
    
    var yAxisLeft = function (g) {
      var ticks = g.selectAll("g.axis-tick")
        .data(tickValues);
      ticks.enter()
        .append("svg:g")
          .classed("axis-tick", true)
          .attr("transform", function (d) { return "translate(0, "+yScale(d.key)+")"; })
        .append("svg:text")
          .attr("text-anchor", "end")
          .attr("dy", ".35em")
          .text(function (d) { return d.value; })
        .append("svg:title")
          .text(function (d) { return d.value; });
    };
    
    svg.append("g")
      .attr("transform", "translate("+(axisWidth-15)+", 0)")
      .call(yAxisLeft);

    var circles = svg.append("g")
      .attr("transform", "translate(0,0)")
      .selectAll("g.dot")
      .data(distinctDevices.reduce(function (a,b) { return a.concat(b); }, []));

    circles.enter()
      .append("g")
      .classed("dot", true)
      .append("circle");

    circles
      .attr("transform", translate);

    circles.select("circle")
      .attr("r", function (d) { return circleScale(d.count);})
      .style("fill", "darkgreen")
      .style("opacity", "0.7");

    function translate(d, i) {
      return "translate("+xScale(d.scaleKey)+", "+yScale(d.mac_address)+")";
    }

  }

}
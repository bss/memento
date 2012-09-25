
function CalendarTimeline() {
  if (!CalendarTimeline.id) CalendarTimeline.id = 0;

  var duration = 0,
      id = CalendarTimeline.id++,
      markers = [],
      width = 380,
      height = 50,
      tickFormat = d3.time.format("%H:%M"),
      brush = d3.svg.brush(),
      data,
      margin = {top: 0, right: 20, bottom: 0, left: 20},
      x = d3.time.scale(),
      y = d3.scale.pow().exponent(0.3).domain([0, 10]).clamp(true),
      player = timelinePlayer(),
      filter;


  player.resolution(3*6e4) // resolution in miliseconds
    .interval(66) // tick interval in miliseconds
    .repeat(false)
    .on("tick.internal", function (player, currentTime) {
      var rollingWindow = 0; // No rolling window
      var startTime = (rollingWindow === 0) ? 0 : currentTime-rollingWindow;
      startTime = (startTime < player.startTime()) ? player.startTime() : startTime;
      timeline.filter([new Date(startTime), new Date(currentTime)]);
    });
        
  function timeline(div) {
    if (!data) {
      return;
    }
    // Some constants for ticks and labels
    var ticksHeight = 6,
        labelHeight = 10;


    x.range([0, width - margin.right - margin.left]);

    // Compute the new x-scale.
    var x1 = x;

    // Retrieve the old x-scale, if this is an update.
    var x0 = this.__chart__ || d3.time.scale()
      .domain([new Date(), new Date()])
      .range(x1.range());
    // Stash the new scale.
    this.__chart__ = x1;
    
    var brushHeight = 20,
        barHeight = (height - brushHeight - margin.top - margin.bottom - labelHeight - ticksHeight-2);

    y.range([barHeight+margin.top+brushHeight, margin.top+brushHeight]);

    g = div.select("svg").select("g");
    
    if (g.empty()) {
      g = div.append("svg")
          .attr("class", "timeline")
          .attr("width", width)
          .attr("height", height)
        .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
  
      g.append("clipPath")
                .attr("id", "clip-0")
              .append("rect")
                .attr("width", width-margin.left-margin.right)
                .attr("height", height);

      g.append("clipPath")
        .attr("id", "events-path")
        .append("path");

      g.append("rect")
          .attr("class", "bar background")
          .attr("width", width-margin.left-margin.right)
          .attr("height", barHeight)
          .attr("x", 0)
          .attr("y", y.range()[1])
          .attr("clip-path", "url(#events-path)");

      g.append("g")
        .attr("width", width-margin.left-margin.right)
        .attr("height", barHeight)
        .attr("clip-path", "url(#clip-"+id+")")
        .append("rect")
          .attr("class", "bar foreground")
          .attr("width", width-margin.left-margin.right) // - margin.right - margin.left
          .attr("height", barHeight)
          .attr("x", 0)
          .attr("y", y.range()[1])
          .attr("clip-path", "url(#events-path)");

      var resizePath = function (d) {
        var e = +(d == "e"),
          x = e ? -1 : 1,
          offset = {x: 0, y: 12};
          
        var size = 8;
        return "m "+offset.x+" "+offset.y+" " + 
          "l "+(size)+" 0 " + 
          "l "+(-size)+" "+size+" " + 
          "l -"+size+" -"+size + 
          "Z";
      };
      
      // Adding brush
      brush.x(x1);
      var gBrush = g.append("g")
        .attr("class", "brush")
        .attr("transform", "translate(0, 0)")
        .call(brush);
      gBrush.selectAll("rect")
        .attr("height", brushHeight)
        .attr("visibility", "hidden");
      gBrush.selectAll(".background").style("visibility", "hidden"); 
      gBrush.selectAll(".resize").append("text")
        .attr('text-anchor', 'middle')
        .attr('y', 0)
        .attr('dy', 10);
      gBrush.selectAll(".resize").append("path").attr("d", resizePath);
      gBrush.selectAll(".resize").append("line")
        .attr("y1", brushHeight+3) // Looks better if we add a bit of margin here
        .attr("y2", barHeight+brushHeight+margin.top);

      

      redrawBrushExtent();

    }

      var ticksData = [x1.domain()[0],
        d3.time.hour.round(x1.invert(x1.range()[0]+(x1.range()[1]-x1.range()[0])*0.33)),
        d3.time.hour.round(x1.invert(x1.range()[0]+(x1.range()[1]-x1.range()[0])*0.66)),
        x1.domain()[1]];

      // Update the tick groups.
      var tick = g.selectAll("g.tick")
          .data(ticksData, function(d) {
            return this.textContent || tickFormat(d);
          });

      var tickEnter = tick.enter().append("svg:g")
          .attr("class", "tick")
          .attr("transform", timelineTranslate(x1))
          .style("opacity", 1e-6);

      tickEnter.append("svg:line")
          .attr("y1", height-margin.bottom-labelHeight-ticksHeight)
          .attr("y2", height-margin.bottom-labelHeight);

      tickEnter.append("svg:text")
          .attr("text-anchor", "middle")
          .attr("dy", "1em")
          .attr("y", height-margin.bottom-labelHeight) //(height/2) * 7 / 6)
          .text(tickFormat);

      // Transition the entering ticks to the new scale, x1.
      tickEnter.transition()
          .duration(duration)
          .style("opacity", 1);

      // Transition the updating ticks to the new scale, x1.
      var tickUpdate = tick.transition()
          .duration(duration)
          .attr("transform", timelineTranslate(x1))
          .style("opacity", 1);

      tickUpdate.select("line")
          .attr("y1", height-margin.bottom-labelHeight-ticksHeight)
          .attr("y2", height-margin.bottom-labelHeight);

      tickUpdate.select("text")
          .attr("y", height-margin.bottom-labelHeight);

      // Transition the exiting ticks to the new scale, x1.
      tick.exit().transition()
          .duration(duration)
          .style("opacity", 1e-6)
          .remove();

  
    g.attr('id', 'timeline-'+id);

    
    
    var area = d3.svg.area()
      .interpolate("linear")
      .x(function(d) { return x(new Date(parseInt(d.key, 10))); })
      .y0(function(d) { return y(d.value)-1; })
      .y1(y.range()[0]);

    if (data) {
      g.select("#events-path")
        .select("path")
        .transition()
          .duration(duration)
          .attr("d", area(data));
    }
    // Update the marker lines.
    var marker = g.selectAll("line.marker")
        .data(markers);

    var y1 = brushHeight+margin.top,
        y2 = barHeight+brushHeight+margin.top;
        
    var title = function (d) { return ""+d.date+": "+d.description; };

    marker.enter().append("svg:line")
        .attr("class", "marker");

    marker.attr("x1", function (d) { return x1(d.date); })
        .attr("x2", function (d) { return x1(d.date); })
        .attr("y1", y1)
        .attr("y2", y2)
        .attr("data-date", function (d) { return d.date; })
        .attr("data-info", title);

    marker.exit().remove();


    var playMarkerDrag = d3.behavior.drag()
      .on("drag", function (d) { 
        if (typeof(d.newX) == "undefined") d.newX = x1(d.date);
        d.newX += d3.event.dx;
        d.newX = Math.max(d.newX, x1(timeline.brush().extent()[0]));
        d.newX = Math.min(d.newX, x1(timeline.brush().extent()[1]));
        d3.select(this)
          .attr("x1", d.newX)
          .attr("x2", d.newX);
      })
      .on("dragend", function (d) {
        timeline.player().currentTime(x1.invert(d.newX).getTime());
        timeline.player().tick();
      });

    var playMarkers = [{date: new Date(timeline.player().currentTime())}];
    var playMarker = g.selectAll("line.playMarker")
        .data(playMarkers);

    playMarker.enter().append("svg:line")
        .classed("playMarker", true);

    playMarker.attr("x1", function (d) { return x1(d.date); })
        .attr("x2", function (d) { return x1(d.date); })
        .attr("y1", y1)
        .attr("y2", y2)
        .call(playMarkerDrag);

    playMarker.exit().remove();

    d3.timer.flush();
  }


  brush.on("brush.chart", function() {
    timeline.player().pause();
    redrawBrushExtent();
  });

  brush.on("brushend.chart", function() {
    redrawBrushExtent();
  });

  timeline.data = function (_) {
    if (!arguments.length) return data;
    data = _;
    return timeline;
  };

  timeline.markers = function(_) {
    if (!arguments.length) return markers;
    markers = _;
    return timeline;
  };

  timeline.width = function(_) {
    if (!arguments.length) return width;
    width = _;
    return timeline;
  };

  timeline.height = function(_) {
    if (!arguments.length) return height;
    height = Math.max(_, 30); // Default to 30 if we're lower
    return timeline;
  };

  timeline.margin = function (_) {
    if (!arguments.length) return margin;
    margin = _;
    return timeline;
  };

  timeline.x = function(_) {
    if(!arguments.length) return x;
    x = _;
    return timeline;
  };

  timeline.tickFormat = function(_) {
    if (!arguments.length) return tickFormat;
    tickFormat = _;
    return timeline;
  };

  timeline.duration = function(_) {
    if (!arguments.length) return duration;
    duration = _;
    return timeline;
  };

  timeline.brush = function(_) {
    if (!arguments.length) return brush;
    brush = _;
    return timeline;
  };
  
  timeline.filter = function(_) {
    if (!arguments.length) return filter;
    filter = _;
    return timeline;
  };

  timeline.player = function(_) {
    if (!arguments.length) return player;
    player = _;
    return player;
  };

  timeline.redrawBrush = function () {
    redrawBrushExtent();
  };

  function redrawBrushExtent() {

    if (brush.empty()) {
      brush.extent(optimalExtentArea());
    }

    var extent = brush.extent();
    
    if (extent) {
      timeline.filter([extent[0], extent[1]]);
      player.startTime(extent[0].getTime())
            .endTime(extent[1].getTime())
            .currentTime(extent[0].getTime());
        

      d3.selectAll(".brush").call(brush);
      var textW = '',
          textE = '';
      if (extent[0].getTime() != x.domain()[0].getTime()) {
        textW = tickFormat(extent[0]);
      }
      if (extent[1].getTime() != x.domain()[1].getTime()) {
        textE = tickFormat(extent[1]);
      }
      d3.select('.brush .resize.w text').text(textW);  
      d3.select('.brush .resize.e text').text(textE);
      d3.select("#clip-"+id+" rect")
          .attr("x", x(extent[0]))
          .attr("width", x(extent[1]) - x(extent[0]));
    }
  }

  function optimalExtentArea() {

    var data = timeline.data() || [];

    dataValues = data.map(function (d) { return d.value; });
    dataValues.sort(d3.ascending);
    var valueLimit = d3.quantile(dataValues, 0.95);

    var filteredData = data.filter(function (d) { return d.value >= valueLimit; }),
        keyMin = d3.min(filteredData, function (d) { return parseInt(d.key, 10); }),
        keyMax = d3.max(filteredData, function (d) { return parseInt(d.key, 10); });

    var newExtent = x.domain();
    if (keyMax > keyMin) {
      var buffer = 1200000; // add 20 minutes to each side.
      newExtent = [new Date(keyMin-buffer), new Date(keyMax+buffer)];
    }
    if (newExtent[0].getTime() < x.domain()[0].getTime()) {
      newExtent[0] = x.domain()[0];
    }
    if (newExtent[1].getTime() > x.domain()[1].getTime()) {
      newExtent[1] = x.domain()[1];
    }
    return newExtent;
  }

  return d3.rebind(timeline, brush, "on");
}

function timelineTranslate(x) {
  return function(d) {
    return "translate(" + x(d) + ",0)";
  };
}



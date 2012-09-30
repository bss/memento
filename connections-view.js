
function ConnectionsView() {
  if (!ConnectionsView.id) ConnectionsView.id = 0;

  var id = ConnectionsView.id++;

  // Properties
  var width = 400,
      height = 400,
      data;


  function view(container) {
    var innerRadius = Math.min(width, height) * 0.24,
        outerRadius = innerRadius + 20;

    var layout = d3.layout.chord()
      .padding(0.05);

    var groupColor = d3.scale.category10();

    // The arc generator, for the groups.
    var arc = d3.svg.arc()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);

    

    innerSvg = container.select("svg").select("g");
    if (innerSvg.empty()) {
      innerSvg = container.html("").append("svg")
          .attr("class", "connections")
          .attr("width", width)
          .attr("height", height)
        .append("g")
          .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
    }

    var chord = d3.svg.chord()
      //.sortChords()
      .radius(innerRadius);

    var chordMatrix = generateMatrix(data);
    layout.matrix(chordMatrix);

    // Add chords.
    var paths = innerSvg.selectAll("path.chord")
        .data(layout.chords);

    paths.enter().append("svg:path")
        .attr("class", "chord")
      .append("svg:title")
        .text(function(d) { return data.nodes[d.source.index].name; });

    var pathFillColor = function(d) { return "#CCCCCC"; };

    paths.style("fill", pathFillColor)
        .style("stroke", function(d) { return d3.rgb(pathFillColor(d)).darker(); })
        .attr("d", chord);

    paths.exit().remove();
    
    // Remove all previous groups, this needs to be done, 
    // since chrome is not able to update the corresponding 
    // path of a textPath reeference dynamicly.
    innerSvg.selectAll("g.group").remove();

    groupsData = (layout.chords().length > 0) ? layout.groups : [];
    
    // Add groups.
    var groups = innerSvg.selectAll("g.group")
      .data(groupsData);

    var g = groups.enter().append("svg:g")
        .attr("class", "group");

    g.append("svg:path")
          .style("fill", function(d) { return groupColor(data.nodes[d.index].group); })
          .attr("id", function(d, i) { return "group" + d.index; });

    g.append("svg:text")
      .each(function(d) { d.angle = (d.startAngle + d.endAngle) / 2; })
      .attr("dy", ".35em")
      .attr("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
      .attr("transform", function(d) {
      return "rotate(" + (d.angle * 180 / Math.PI - 90) + ")" + 
        "translate(" + (innerRadius + 26) + ")" + 
        (d.angle > Math.PI ? "rotate(180)" : "");
      })
      .text(function(d) { return ""+data.nodes[d.index].name; });
       
    groups.select("path")
      .attr("d", function (d) {
        if ( !isNaN(d.value) && d.value ) {
          return arc(d);
        }
        return "M 0 0"; // Simulate empty path (null returns an error in chrome)
      } );


    groups.attr("data-uid", function (d) { return ""+data.nodes[d.index].name; });

    groups.on("mouseover", fade(0.1)).on("mouseout", fade(1));
    
    groups.exit().remove();

    // Returns an event handler for fading a given chord group.
    function fade(opacity) {
      return function(g, i) {
        innerSvg.selectAll("path.chord")
            .filter(function(d) {
              return d.source.index != i && d.target.index != i;
            })
          .transition()
            .style("opacity", opacity);
      };
    }
/*
    var legend = container.select("svg").selectAll("g.legend")
      .data(groupColor.domain(), String)
    .enter().append("g")
      .classed("legend", true)
      .attr("transform", function (legend,i) { return "translate(20, "+(10+22*i)+")"; });

    legend.append("svg:circle")
      .attr("r", 8).style("fill", groupColor);

    legend.append("svg:text")
      .attr("text-anchor", "start")
      .attr("x", 13)
      .attr("y", 4)
      .text(String);
      */

    innerSvg.select('text.error').remove();
    if (innerSvg.selectAll('*').empty()) {
      innerSvg.append('svg:text').classed('error', true).text('No data available.');
    }
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
    oldData = data;
    data = parseData(_, oldData);
    return view;
  };

  return view;

  function parseData(data, oldData) {
    data.nodes = d3.values(data.nodes);
    if (oldData) {
      oldDataUidList = oldData.nodes.map(function (d) {return d.uid;});
      data.nodes = data.nodes.map(function (newNode) {
        var oldIndex = oldDataUidList.indexOf(newNode.uid);
        if (oldIndex !== -1) {
          return oldData.nodes[oldIndex];
        }
        return newNode;
      });
    }

    nodesMap = data.nodes.map(function (d) { return d.bluetooth_mac; });
    data.links.forEach(function (d) {
      d.source = nodesMap.indexOf(d.from);
      d.target = nodesMap.indexOf(d.to);

      data.nodes[d.source].linkCount = data.nodes[d.source].linkCount || 0;
      data.nodes[d.source].linkCount += 1;
      data.nodes[d.target].linkCount = data.nodes[d.target].linkCount || 0;
      data.nodes[d.target].linkCount += 1;
    });
    return data;
  }
  function generateMatrix (data) {
    var matrix = [],
      n = data.nodes.length;

    matrix = d3.range(n).map(function (i) { 
      return d3.range(n).map(function(j) { return 0; });
    });
    data.links.forEach(function (link, i) {
      var target, source;
      if (typeof(link.target) == "number") {
        target = link.target;
        source = link.source;
      } else {
        target = link.target.index;
        source = link.source.index;
      }
      if (typeof(matrix[target][source]) == "undefined") matrix[target][source] = 0;
      if (typeof(matrix[source][target]) == "undefined") matrix[source][target] = 0;
      matrix[target][source] += link.count;
      matrix[source][target] += link.count;
      
      if (typeof(data.nodes[source].count) == "undefined") data.nodes[source].count = 0;
      if (typeof(data.nodes[target].count) == "undefined") data.nodes[target].count = 0;
      data.nodes[source].count += link.count;
      data.nodes[target].count += link.count;
    });
    return matrix;
  }
}
(function (){

  var locationStore = setupLocationTimeFilter(),
    bluetoothStore = setupBluetoothTimeFilter(),
    bluetoothNodes = {},
    timeline = new CalendarTimeline()
      .width(875)
      .height(70)
      .duration(500),
    progress = new ProgressHandler(),
    connectionsView = new ConnectionsView()
      .width(window.innerWidth)
      .height(window.innerHeight*0.8),
    infoView = new InfoView(),
    statsView = new StatsView(),
    dateSwitcher = new DateSwitcher()
      .on('dateChanged', changeDate),
    views = {map: ['#map', '#timeline-panel'],
         connections: ['#connections', '#timeline-panel'],
         stats: ['#stats']},
    currentView = '',
    currentUser = "",
    viewResolution = d3.time.day,
    params = urlParams(),
    APIBaseUrl = "/sensible_outbound/v1/",
    authToken;

  function switchView(newView) {
    progress.showHide(newView);

    currentView = newView;
    $('.view-controlled').hide();
    $(views[newView].join(',')).show();
    
    refreshTimelineData();
    renderAll();
  }

  jQuery(function () {
    

    $('.toggle-fullscreen-layer').click(function (e) {
      e.preventDefault();
      
      switchView($(this).attr('href').slice(1));
      
      $('.toggle-fullscreen-layer').removeClass('selected');
      $(this).addClass('selected');
    });

    $('.map-style-toggle').click(function (e) {
      e.preventDefault();
      mapStyleToggle();
      $("i", this).toggle();
    });

    if (typeof(params.status) !== "undefined" && params.status === "success" && typeof(params.token) !== "undefined") {
      //history.pushState(null, null, window.location.href.replace(window.location.search, ""));
      authToken = params.token;
    }
    
    if (authToken) {
      loadLocationData();
      loadBluetoothData();
    } else {
      $('#welcomeScreen').show();
    }

  });

  locationStore.resultObserver("timeline")
    .addCallback(renderTimeline);

  locationStore.resultObserver("all")
      .reducer(function (data) {
        var filteredData = data;
        if (typeof(timeline.filter()) != "undefined") {
          filteredData = [];
        var startTime = timeline.filter()[0].getTime(),
          endTime = timeline.filter()[1].getTime();

          data.forEach(function (d, i) {
            var time = d.date.getTime();
            if (time >= startTime && time <= endTime) {
              filteredData.push(d);
            }
          });
      }
      return filteredData;
      });

  locationStore.resultObserver("all")
    .addCallback(function (data) {
      if (currentView == 'map') {
        pointLayer.data(data);
      }
    });

  bluetoothStore.resultObserver("timeline")
    .addCallback(renderTimeline);

  bluetoothStore.resultObserver("all")
    .reducer(function (data) {
        var filteredData = data;

        if (typeof(timeline.filter()) != "undefined") {
          filteredData = [];
        var startTime = timeline.filter()[0].getTime(),
          endTime = timeline.filter()[1].getTime();
        
          data.forEach(function (d, i) {
            var time = d.date.getTime();
            if (time >= startTime && time <= endTime) {
              filteredData.push(d);
            }
          });
      }

      filteredData = binConnectionData(filteredData);
      
      filteredData = d3.values(filteredData).map(function (d) {
          d[0].count = d.length;
          return d[0];
        });
      return filteredData;
      });

  bluetoothStore.resultObserver("all")
    .addCallback(renderConnections)
    .addCallback(renderStats);
  
    
  timeline.player()
    .on("tick", function (player, currentTime) {
      renderAll();
    })
    .on("stateChange", function (state) {
      if (state == "playing") {
        playbackOn = true;
        $('.btn-playpause i.icon-play').hide();
        $('.btn-playpause i.icon-pause').show();
      } else {
        playbackOn = false;  
        $('.btn-playpause i.icon-play').show();
        $('.btn-playpause i.icon-pause').hide();
      }
    })
    .on("reset", function () {
      $('.btn-playpause i.icon-play').show();
      $('.btn-playpause i.icon-pause').hide();  
    });

  timeline.on("brush.vis", function() {
      renderAll();
    }).on("brushend.vis", function() {
      renderAll();
    });

    d3.select('#playback-speed').on('change', function () {
      updatePlaybackSpeed();
      return true;
    });

    var playbackSpeedScale = d3.scale.linear()//.exponent(0.1)
      .domain([parseInt(d3.select('#playback-speed').attr('min'), 10), parseInt(d3.select('#playback-speed').attr('max'), 10)])
      .range([2*6e4, 10*6e4]); //3*6e4

    function updatePlaybackSpeed() {
      var val = parseInt(document.getElementById("playback-speed").value, 10);
      timeline.player().resolution(playbackSpeedScale(val));
    }

    setupMap();
  setupDropups();
  setupDropdowns();
  updatePlaybackSpeed();
  switchView('map');

  jQuery(function () {
    $('.btn-playpause').click (function (e) {
      e.preventDefault();
      timeline.player().playpause();
    });

    $('.btn-repeat').click (function (e) {
      e.preventDefault();
      timeline.player().repeat(!timeline.player().repeat());
      renderAll();
    });

    $('#show-friends').change(function (e) {
      e.preventDefault();
      renderAll();
    });

  });

  function callAPI(path, cb, queryMap) {
    var url = APIBaseUrl+path+"?token="+authToken;
    if (typeof(queryMap) !== "undefined") {
      d3.map(queryMap).forEach(function (key, value) {
        url += "&"+key+"="+value;
      });
    }
    d3.json(url, cb);
  }

  function loadLocationData() {
    progress.incrementAll('map', 'stats');
    callAPI("location", handleLocationData);
  }

  function handleLocationData(data) {
    if (data && data.length > 0) {
      data.sort(function (a,b) { return d3.ascending(a.timestamp, b.timestamp); });
      locationStore.data(data);
      refreshTimelineData();
      renderAll();
      $('#welcomeScreen').hide();
    } else {
      var err = "";
      err += '<h1>Sorry!</h1>';
      err += "<p>It looks like we don't have any data on you yet.</p>";
      err += "<p>Please ensure the data collector is installed and running on the phone.</p>";
      err += "<p>It might take several days for the data to appear here. Please be patient.</p>";
      err += "<p><strong>Thanks!</strong></p>";
      $('#welcomeScreen .splash').html(err);
    }
    progress.decrementAll('map', 'stats');
  }

  function loadBluetoothData() {
    progress.incrementAll('connections', 'stats');
    d3.json("/sensible_inbound/users/me?token="+authToken, handleUserdata);

    progress.incrementAll('connections', 'stats');
    callAPI("friends", handleBluetoothFriendsData, {po_class: "BluetoothScans"});
  }

  function handleUserdata(data) {
    var id = data._id;
    bluetoothNodes[data.bluetooth_mac] = {name: data.name, uid: id, bluetooth_mac: data.bluetooth_mac, group: "student"};

    progress.incrementAll('connections', 'stats');
    callAPI("bluetooth", handleBluetoothData(data.bluetooth_mac));

    progress.decrementAll('connections', 'stats');
  }

  function handleBluetoothFriendsData(data) {
    data.forEach(function (friend) {
      bluetoothNodes[friend.bluetooth_mac] = {
        name: friend.name || "?", 
        uid: friend.id, 
        bluetooth_mac: friend.bluetooth_mac, 
        group: "student"
      };

      progress.incrementAll('connections', 'stats');
      callAPI("bluetooth", handleBluetoothData(mac), {friend_id: friendId});
    });
    progress.decrementAll('connections', 'stats');
  }

  function handleBluetoothData(from_mac) {
    // "links":[{"name":"Galaxy Nexus","mac_address":"F0:E7:7E:DD:61:38","timestamp":1339662713,"from":"351565051060678","to":"351565053474810"}
    /*
    if (data && typeof(data.nodes) != "undefined" &&
      typeof(data.links) != "undefined") {
      bluetoothNodes = data.nodes;
      bluetoothStore.data(data.links);
      refreshTimelineData();
      renderAll();
    }*/
    return function (data) {
      var links = [];
      data = data || [];
      data.forEach(function (probe) {
        probe.devices.forEach(function (device) {
          if (device.mac_address.indexOf(":") !== -1) {
            links.push({
              name: device.name,
              mac_address: device.mac_address,
              timestamp: probe.timestamp,
              from: from_mac,
              to: device.mac_address
            });
          }
        });
      });
      bluetoothStore.appendData(links);
      refreshTimelineData();
      renderAll();
      progress.decrementAll('connections', 'stats');
    }
  }

  function changeDate(day) {
    initialData = true;
    locationStore.filterDimension("display-resolution", viewResolution(day));
    bluetoothStore.filterDimension("display-resolution", viewResolution(day));
    refreshTimelineData();
    renderAll();
  }

  function renderTimeline() {
    d3.select("#day-timeline").call(timeline);
  }

  function refreshTimelineData() {
    timeline.player().pause();
    if (currentView == 'map') {
      var locationData = locationStore.filteredData();
      if (locationData.length > 0) {
        timeline.x().domain([locationData[0].date, locationData[locationData.length-1].date]);
          locationData = convertToMovementData(locationData);
          timeline.data(locationData);
      }
    } else if (currentView == 'connections') {
      var connectionData = bluetoothStore.filteredData();
      var timelineConnectionData = [];
      if (connectionData.length > 0) {
        var firstPoint = connectionData[0].date, 
            lastPoint = connectionData[connectionData.length-1].date,
            slots = 300;

        // Set a fixed amount of points: 300 for the timeline (but at most one pr. 5 minutes)
        var resolution = (lastPoint.getTime()-firstPoint.getTime())/slots;
        resolution = Math.max(resolution, 3e5);

        var timelineSamplingTimes = d3.range( Math.floor(firstPoint.getTime()/resolution)*resolution, 
                            Math.ceil(lastPoint.getTime()/resolution)*resolution+1,
                            resolution);
        
        var lastBisectionPoint = 0;
        var bisector = d3.bisector(function(d) { return d.date.getTime(); }).right;
        timelineConnectionData = timelineSamplingTimes.map(function (t) {
          var hiBound = bisector(connectionData, t+resolution, lastBisectionPoint);
          var data = connectionData.slice(lastBisectionPoint, hiBound);
          lastBisectionPoint = hiBound;
          
          var binnedConnectionData = d3.values(binConnectionData(data));

          if (binnedConnectionData.length > 0) {
              binnedConnectionData = binnedConnectionData.reduce(function (a,b) { return a.concat(b); });
              binnedConnectionData.sort(function (a,b) { return d3.ascending(a.date, b.date); });
              return {key: t, value: binnedConnectionData.length};
            }
          return {key: t, value: 0};
        });
        
        var maxVal = d3.max(timelineConnectionData, function (d) { return d.value; }),
          scale = d3.scale.linear().domain([0, maxVal]).range([0,10]);
        timelineConnectionData = timelineConnectionData.map( function (d) {
          d.value = scale(d.value);
          return d;
        });
        
      }
      
      if (timelineConnectionData.length > 0) {
        timeline.x().domain([new Date(parseInt(timelineConnectionData[0].key, 10)), 
                new Date(parseInt(timelineConnectionData[timelineConnectionData.length-1].key, 10))]);
      } else {
        if (locationStore.filterDimension("display-resolution")) {
          var domain = [locationStore.filterDimension("display-resolution"),
                  new Date(locationStore.filterDimension("display-resolution").getTime()+864e5)];
          timeline.x().domain(domain);
          timelineConnectionData = domain.map(function (d) { return {key: d.getTime(), value: 0}; });
        }
      }
      timeline.data(timelineConnectionData);
    }
    renderTimeline();
    timeline.brush().clear();
    timeline.redrawBrush();
  }

  function renderConnections(data) {
    if (currentView == 'connections') {
      data = data || bluetoothStore.resultObserver("all").result(true);
      
      connectionsView.data({nodes: bluetoothNodes, links: data});
        d3.select("#connections").call(connectionsView);
      }
  }

  function renderStats() {
    if (currentView == 'stats') {

      var locationData = locationStore.data();
      var connectionsData = bluetoothStore.data();

      statsView.data({currentUser: currentUser, today: locationStore.filterDimension("display-resolution"), locations: locationData, connections: connectionsData});
        d3.select("#stats").call(statsView);
    }
  }


  // Whenever the brush moves, re-rendering everything.
  function renderAll() {
    locationStore.forceUpdate();
    bluetoothStore.forceUpdate();

    d3.selectAll('.btn-repeat').classed("btn-toggle-on", timeline.player().repeat());
    
  }

  function updateDaySelector(data) {
    var dates = d3.entries(d3.nest()
      .key(function(d) { return viewResolution(d.date).getTime(); }) // By
      .rollup(function (d) { return d.length;})
      .map(data))
      .map(function (d) { 
        d.key = new Date(parseInt(d.key, 10)); 
        return d;
      })
      .reverse();

    dateSwitcher.data(dates);

    d3.select('#calendar-navigation').call(dateSwitcher);

  }

  function setupMap() {
    pointLayer.on('pointClick', function (d) {
      if (d.events.length > 0) {
        var startTime = d.events[0].date.getTime(),
          endTime = d.events[d.events.length-1].date.getTime();

        var bluetoothData = bluetoothStore.filteredData()
          .filter(function (d) { return d.from == currentUser && d.date.getTime() >= startTime && d.date.getTime() <= endTime; });
        
        infoView.data({location: d, connections: bluetoothData, nodes: bluetoothNodes});
        d3.select('#point-info-view').call(infoView);
      }
    });
  }

  function setupLocationTimeFilter() {
    var locationStore = timefilter()
      .preprocessor(function (data) {
        data = data.sort(function (a,b) { return d3.ascending(parseInt(a.timestamp, 10), parseInt(b.timestamp, 10)); });
        data.forEach(function (d,i) {
          d.index = i;
            if (d.type == "person") {
            d.group = d.extra_info.uid; //[d.extra_info.uid, d.mac_hash].join(":");
          } else {
            d.group = "other";
          }
            d.date = new Date(parseInt(d.timestamp, 10)*1000);
            d.description = d.description;
            
        });
        updateDaySelector(data);
        return data;
      })
      .addDimension("time", function (d) {
        return d.date;
      })
      .addDimension("display-resolution", function (d) {
        return viewResolution(d.date);
      });
    return locationStore;
  }

  function setupBluetoothTimeFilter() {
    var tf = timefilter()
      .preprocessor(function (data) {
        data.forEach(function (d) {
          d.date = new Date(d.timestamp*1000);
        });
        return data;
      })
      .addDimension("time", function (d) {
        return d.date;
      })
      .addDimension("display-resolution", function (d) {
        return viewResolution(d.date);
      });
    return tf;
  }

  function setupDropups() {
    d3.select('html').on('click.dropup', function () {
      d3.selectAll(".dropup-menu").classed("open", false);
    }, true);
    d3.selectAll(".dropup-toggle").on("click.dropup", function () {
      d3.event.preventDefault();

      var el = d3.select((d3.select(this).attr('href')));
      
      var open = el.classed('open');
      el.style('opacity', (open) ? '1' : '0' );
      el.classed('open', !open);
      el.transition()
        .duration(250)
        .style('opacity', (open) ? '0' : '1');

    });  
  }

  function setupDropdowns() {
    d3.select('html').on('click.dropdown', function () {
      d3.selectAll(".dropdown-menu").classed("open", false);
    }, true);
    d3.selectAll(".dropdown-toggle").on("click.dropdown", function () {
      d3.event.preventDefault();

      var el = d3.select((d3.select(this).attr('href')));
      
      var open = el.classed('open');
      el.style('opacity', (open) ? '1' : '0' );
      el.classed('open', !open);
      el.transition()
        .duration(250)
        .style('opacity', (open) ? '0' : '1');

    });  
  }

  function convertToMovementData(data) {
      var interpolatedPoints = {};
      var lastPoint = data[0];
      for(var i=0, len=data.length; i<len; i++) {
        var d = data[i];
        var dist = d3.geo.distance([lastPoint.location.latitude, lastPoint.location.longitude], 
                                   [d.location.latitude, d.location.longitude]);
        var t0 = d3.time.minute(d.date).getTime();
        
        if (typeof(interpolatedPoints[t0]) == "undefined") interpolatedPoints[t0] = 0;
        interpolatedPoints[t0] = Math.max(interpolatedPoints[t0], dist);
        lastPoint = d;
      }
      return d3.entries(interpolatedPoints);
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

  
  function ProgressHandler() {
    var _ = {},
      target = d3.selectAll('.progress-container'),
      count = {general: 0};

    _.increment = function (view) {
      if (!arguments.length) view = 'general';
      if (typeof(count[view]) == "undefined") count[view] = 0;
      count[view]++;
      _.showHide(currentView);
    };
    _.incrementAll = function () {
      d3.values(arguments).forEach(function (view) {
        _.increment(view);
      });
    };
    _.decrement = function (view) {
      if (!arguments.length) view = 'general';
      if (typeof(count[view]) == "undefined") count[view] = 0;
      count[view]--;
      _.showHide(currentView);
    };
    _.decrementAll = function () {
      d3.values(arguments).forEach(function (view) {
        _.decrement(view);
      });
    };
    _.showHide = function (view) {
      if (!arguments.length) view = 'general';
      if (count.general) {
        target.style('display', 'block');
      } else {
        if (typeof(count[view]) !== "undefined" && count[view]) {
          target.style('display', 'block');
        } else {
          target.style('display', 'none');
        }
      }
    }
    return _;
  }

  function urlParams() {
    var urlParams = {},
        match,
        pl     = /\+/g,  // Regex for replacing addition symbol with a space
        search = /([^&=]+)=?([^&]*)/g,
        decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
        query  = window.location.search.substring(1);

    while (match = search.exec(query)) {
      urlParams[decode(match[1])] = decode(match[2]);
    }
    return urlParams;
  }
  
})();


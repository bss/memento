Intro
===
memento is an interface to the Sensible DTU project (http://sensible.dtu.dk). It enable users to see and playback their location and "connections" over time. Connections happen when a user meets another Sensible DTU user.

Architecture
===
This application was created as a prototype and is therefore characterised by it. An improved design is outlined further down.

Login is done using a specific call to the backend that authenticates the user through campusnet cas authentication. After login the user is sent to a predefined redirection url with an appended status and a token. The token is later on used to fetch data from the backend.

A lot of the application resides in the visualisation-controller.js file. It sets up the UI, manages interaction and takes care of fetching data from the backend using the data store.

The application constists of 3 views: location, connections and stats. Markup for all views are located in the index.html file. When the user changes view using the menu, the selected view is simply shown while all other views are hidden. Since rendering all views all the time is a bit cumbersome, only the currently shown views is rendered in the visualisation controller (see renderTimeline(), renderConnections() and renderStats() in visualisation-controller.js).

The data is loaded in the "load*" and "handle*" functions, their implementation is fairly straightforward. After the data has been loaded it is stored in the data-store (data-store.js). It works primarily as a convience wrapper for crossfilter (http://square.github.com/crossfilter/) adding callbacks on data-change.

Most of the view-elements in the app has been split into their own files:

- calendar-timeline.js: takes care of the timeline shown in the bottom of the location and connection views.
- connections-view.js: parses the bluetooth connection data and displays it in a radial graph.
- date-switcher.js: handle the datechanger at the top of the page.
- info-view.js: a view shown in a popup when the user clicks a point, displays the connections the user had at that specific time.
- map-view.js: displays the location of the user on the map. The locations are clustered in time and space using dbscan/k-means.
- stats-view.js: displays summarised user stats.

Common for all of it, is that d3 is leveraged as much as possible.

Some smaller stuff
---
- d3-extras.js adds support for d3 to calculate the distance between two points using the haversine method.
- dbscan.js: Javascript implementation of the dbscan clustering algorithm.
- k-means.js: Javascript implementation of the k-means clustering algorithm.
- timeline-player.js: helper that takes care of the state of data-playback.

An improved design
===
Many improvements could be made on the overall design. First of all it would be beneficial to use a framework such as backbone.js for routing, views and models. This would also make it easier to split up the code in nice modules.

License
===
FreeBSD License, see [LICENSE.md].


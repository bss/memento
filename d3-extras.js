(function() {
  // Calculates the distance in km between two positions based on the Haversine distance formula
  d3.geo.distance = function (loc1, loc2) {
      var R = 6371; // km

      var dLat = (loc2[0]-loc1[0]) * Math.PI / 180;
      var dLon = (loc2[1]-loc1[1]) * Math.PI / 180;
      loc1[0] = loc1[0] * Math.PI / 180;
      loc2[0] = loc2[0] * Math.PI / 180;

      var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(loc1[0]) * Math.cos(loc2[0]); 
      var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
      return R * c;
  };
})();
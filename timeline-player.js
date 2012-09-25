(function (exports) {
  exports.timelinePlayer = timelinePlayer;

  function timelinePlayer() {
    var player = {},
      resolution = 6000,
      interval,
      currentTime = 0,
      startTime,
      endTime,
      repeat = false,
      paused = true,
      dispatcher = d3.dispatch("tick", "reset", "stateChange"),
      state = "paused";
    
    player.tick = function() {
      currentTime += resolution;
      if (currentTime < startTime || (currentTime >= endTime && repeat) ) {
        currentTime = startTime;
      }
      dispatcher.tick(player, currentTime);
      if (currentTime >= endTime && !repeat) {
        player.pause();
        currentTime = 0;
        dispatcher.reset();
      }
      return player;
    };
    
    player.play = function () {
      paused = false;
      player.state("playing");
      function playInternal() {
        if (!paused) {
          player.tick();
          setTimeout(playInternal, interval);
        }
      }
      playInternal();
    };
    player.pause = function () {
      paused = true;
      player.state("paused");
    };
    player.playpause = function () {
      if (paused) {
        player.play();
      } else {
        player.pause();
      }
    };
  
    player.interval = function (_) {
      if (arguments.length < 1) return interval;
      interval = _;
      return player;
    };
    
    player.repeat = function (_) {
      if (arguments.length < 1) return repeat;
      repeat = _;
      return player;
    };
    
    player.resolution = function (_) {
      if (arguments.length < 1) return resolution;
      resolution = _;
      return player;
    };
    
    player.startTime = function (_) {
      if (arguments.length < 1) return startTime;
      startTime = _;
      return player;
    };
    
    player.endTime = function (_) {
      if (arguments.length < 1) return endTime;
      endTime = _;
      return player;
    };
    
    player.currentTime = function (_) {
      if (arguments.length < 1) return currentTime;
      currentTime = _;
      return player;
    };

    player.state = function (_) {
      if (arguments.length < 1) return state;
      state = _;
      dispatcher.stateChange(state);
      return player;
    };

    return d3.rebind(player, dispatcher, "on");
  }
})(this);
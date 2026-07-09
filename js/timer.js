/* Deadline-based countdown: remaining time is always deadline - now, so background-tab
 * throttling and reloads cannot drift the clock. */
(function (S) {
  'use strict';

  function Countdown(deadlineEpochMs, opts) {
    opts = opts || {};
    var interval = null;
    var warned = false;
    var self = {
      deadline: deadlineEpochMs,
      remainingMs: function () { return Math.max(0, deadlineEpochMs - Date.now()); },
      remainingSec: function () { return Math.ceil(self.remainingMs() / 1000); },
      stop: function () {
        if (interval) { clearInterval(interval); interval = null; }
        document.removeEventListener('visibilitychange', tick);
      },
      start: function () {
        tick();
        interval = setInterval(tick, 1000);
        document.addEventListener('visibilitychange', tick);
        return self;
      }
    };
    function tick() {
      var ms = self.remainingMs();
      if (opts.onTick) opts.onTick(Math.ceil(ms / 1000));
      if (!warned && ms <= 5 * 60 * 1000 && ms > 0 && opts.onFiveMinutes) {
        warned = true;
        opts.onFiveMinutes();
      }
      if (ms <= 0) {
        self.stop();
        if (opts.onExpire) opts.onExpire();
      }
    }
    return self;
  }

  // Simple elapsed stopwatch (per-question pacing)
  function Stopwatch() {
    var startMs = Date.now();
    return {
      restart: function () { startMs = Date.now(); },
      seconds: function () { return (Date.now() - startMs) / 1000; }
    };
  }

  S.timer = { Countdown: Countdown, Stopwatch: Stopwatch };
})(window.SATPrep = window.SATPrep || {});

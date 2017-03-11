var miku, timer;

Miku.init((instance) => {
  miku = instance;
  setLyrics();

  miku.on('noteOn', (noteNum, velocity) => {
    console.log('note on', noteNum, velocity);
  }).on('pitchBend', (bend1, bend2) => {
    console.log('bend', bend1, bend2);
  }).on('noteOff', (noteNum, velocity) => {
    console.log('note off', noteNum, velocity);
  }).on('sysEx', (data) => {
    console.log('sys ex', data);
  });
});

function setLyrics() {
  let lyrics = document.getElementById('lyrics').value
  miku.lyrics(lyrics);
}

function noteOn(num) {
  miku.noteOn(num, 64, 0);

  clearTimeout(timer);

  timer = setTimeout(function () {
    miku.noteOff(num, 0, 0);
  }, 1000)
}

function pitchBend(value) {
  miku.pitchBend(value, 0);
}

// send pitch bend test
let pitch = 8192;
document.addEventListener('keydown', function (e) {
  switch (e.keyCode) {
    case 37:
      miku.controlChange(1, 0);
      break;
    case 38:
      pitch += 128;
      miku.pitchBend(pitch);
      break;
    case 39:
      miku.controlChange(1, 127);
      break;
    case 40:
      pitch -= 128;
      miku.pitchBend(pitch);
      break;
  }
});
// expo-audio in tests: a silent player. Scenes then run on their JSON timings, as they do without narration.
const player = { play() {}, pause() {}, seekTo: () => Promise.resolve(), replace() {}, volume: 1, muted: false };

module.exports = {
  useAudioPlayer: () => player,
  useAudioPlayerStatus: () => ({ isLoaded: false, playing: false, currentTime: 0, duration: 0, didJustFinish: false }),
  preload: () => Promise.resolve(),
  setAudioModeAsync: () => Promise.resolve(),
};

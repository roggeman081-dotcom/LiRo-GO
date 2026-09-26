/* LiRo GO v44 safety layer: keep the smart home local and cheap.
   Disables only the automatic daily Radar AI suggestion. Manual AI actions remain available. */
try {
  if (typeof maybeGenerateRadarSuggestion === 'function') {
    maybeGenerateRadarSuggestion = async function(){ return; };
  }
} catch (err) {
  console.warn('LiRo v44 safety layer could not disable automatic Radar AI', err);
}

// By doing export default ... this allows this class to be imported and used elsewhere
export function setZOrderForSharedElements(game) {
  // Set the depth of the game canvas to be all the way in the back
  game.canvas.style.position = "absolute";
  game.canvas.style.left = "0";
  game.canvas.style.top = "0";

  // Get a reference to the css objects we want to position
  var gameHeader = document.querySelector(".game-header-banner");
  var updateTilegridButton = document.querySelector(
    ".updateTilegrid-button-container"
  );
  var resetTilegridButton = document.querySelector(
    ".resetTilegrid-button-container"
  );

  // Set the z-index property for all other objs\
  // helloWorldBox.style.zIndex = "-1"; // far back
  game.canvas.style.zIndex = "0";
  gameHeader.style.zIndex = "2";
  updateTilegridButton.style.zIndex = "3";
  resetTilegridButton.style.zIndex = "3";
}

export function setZOrderForMainGameElements(game) {
  // Set the depth of any extra elements that main-game-scene.js adds or requires
  // that are unique to those in setZOrderForSharedElements()
}
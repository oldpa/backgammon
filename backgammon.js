;(function() {
'use strict';

window['BackGammon'] = window['BackGammon'] || function(canvasId, conf) {
  
conf = conf || {}

// CONSTANTS
var BLACK = 'b',
    WHITE = 'w';
var START_POSITION=['','ww','','','','','bbbbb',
                    '','bbb','','','','wwwww',
                    'bbbbb','','','','www','',
                    'wwwww','','','','','bb','', '', '', '', '', '', '', '', '', ''], // 1-indexed
    HOME_MAP = {'w': 25, 'b': 0},
    OUT_MAP = {'w': 0, 'b': 25},
    HOME_STORAGE_MAP = {'w': 33, 'b': 34},
    VANITY_MAP = {'w': 'White', 'b': 'Black'},
    WHITE_PLAYER = 0,
    BLACK_PLAYER = 1,
    STATES = {CHOOSE_STARTER: 1, MOVING: 2, THROWING_DICE: 4},
    EMPTY = '',
    SIGN_MAP = {'b': -1, 'w': 1};

// object to return
var widget = {};

var canvas,
    context;

    
// Size contants
var containerWidth,
    containerHeight,
    halfBoardWidth,
    halfBoardHeight,
    arrowWidth,
    arrowHeight,
    pieceRadius,
    ROLL_BUTTON_X,
    ROLL_BUTTON_Y,
    ROLL_BUTTON_WIDTH,
    ROLL_BUTTON_HEIGHT;

// global state variables
var selectedPoint,
    currentDiceRoll = [],
    remainingDices = [],
    currentPlayer,
    gameState,
    currentPosition = START_POSITION; // 1 indexed list;
    
// Previous states
var previousStates = [];

//------------------------------------------------------------------------------
// State function (Load/Save/Undo)
//------------------------------------------------------------------------------

var saveState = function() {
  return JSON.stringify({
    currentPlayer: currentPlayer,
    gameState: gameState,
    currentPosition: currentPosition,
    currentDiceRoll: currentDiceRoll,
    remainingDices: remainingDices,
    selectedPoint: selectedPoint
  });
}

var loadState = function(state) {
  state = JSON.parse(state);
  currentPlayer = state.currentPlayer;
  gameState = state.gameState;
  currentPosition = state.currentPosition;
  currentDiceRoll = state.currentDiceRoll;
  remainingDices = state.remainingDices;
  selectedPoint = state.selectedPoint;
  stateChanged();
  
  redraw();
}

var stateChanged = function () {
  console.log('adding state');
  previousStates.push(saveState());
}

var undo = function () {
  if (previousStates) {
    console.log('undoing');
    var prev = previousStates.slice(-2, -1);
    loadState(prev);
    previousStates = previousStates.slice(0, -2);
    redraw();
  }
}

//------------------------------------------------------------------------------
// Moving functions
//------------------------------------------------------------------------------

// Check if there exists a possible move for player
var canMove = function (player) {
  // Go through each points for player
  if (hasPieceOut(player)) {
    var point = OUT_MAP[player];
    for (var i=0; i < remainingDices.length; i++) {
      var new_point = point + SIGN_MAP[player] * remainingDices[i];
      if (isValidMove(point, new_point)) {
        return true;
      }
    }
  }
  else {
    for ( var point=0; point<26; point++ ) {
      if (getPlayerAtPoint(point) == player) {
      
        for (var i=0; i < remainingDices.length; i++) {
          var new_point = point + SIGN_MAP[player] * remainingDices[i];
          if (isValidMove(point, new_point)) {
            console.log('can move from', point, new_point);
            return true;
          }
        }
      
      }
    }
  }
  console.log('cant move :(');
  return false;
}

var isValidMove = function(from_point, to_point) {
  // No piece at position
  if (!currentPosition[from_point].length) {
    console.log('No piece at position', from_point)
    return false;
  }
  
  // Wrong color to move
  if ( getPlayerAtPoint(from_point) != currentPlayer ) {
    return false;
  }
  
  // No dice corresponding to move
  var steps = getSteps(from_point, to_point);
  if ( remainingDices.indexOf(steps) == -1 ) {
    console.log('no dice matching', remainingDices, steps, currentPlayer, SIGN_MAP[currentPlayer]);
    return false;
  }
  
  // Is destination occupied by opponent
  if ( getPlayerAtPoint(to_point) == swap(currentPlayer) &&
       currentPosition[to_point].length > 1) {
    console.log('Occupied by opponent', currentPosition[to_point]);
    return false;
  }
  
  // Is home point before end game
  if (!inEndGame(currentPlayer) && to_point == HOME_MAP[currentPlayer]) {
    console.log('cant move to home point yet');
    return false;
  }
  
  // If point is outside
  if (to_point < 0 || to_point > 25) {
    
    // If not in endgame
    if (!inEndGame(currentPlayer)) {
      console.log('not in endgame');
      return false;
    }
    
    // If has piece before
    if (hasPieceBefore(currentPlayer, from_point)) {
      console.log('piece outside and has higher piece');
      return false;
    }
  }
  
  return true;
}

// Move piece without checking any logic
var _movePiece = function (from_point, to_point) {
  var piece_to_move = currentPosition[from_point].slice(-1);
  currentPosition[from_point] = currentPosition[from_point].slice(0, -1);
  currentPosition[to_point] += piece_to_move;
}

var move = function (from_point, to_point) {
  // Check if valid move
  if (!isValidMove(from_point, to_point)) {
    console.log('Not a valid move', from_point, to_point, currentPlayer);
    return false;
  }
  
  // Check if to_point has one opponent
  if ( getPlayerAtPoint(to_point) == swap(currentPlayer) && getPiecesAtPoint(to_point).length == 1) {
    _movePiece(to_point, OUT_MAP[swap(currentPlayer)]);
  }
  
  _movePiece(from_point, to_point)
  
  // If player moved home (or above), move to home storage
  if (sign(currentPlayer)*to_point >= sign(currentPlayer)*HOME_MAP[currentPlayer]) {
    _movePiece(to_point, HOME_STORAGE_MAP[currentPlayer]);
  }
  redraw();
  return true; 
}

//------------------------------------------------------------------------------
// Util functions
//------------------------------------------------------------------------------

var deepCopy = function (obj) {
  return JSON.parse(JSON.stringify(obj));
}

var swap = function (currentPlayer) {
  return currentPlayer == BLACK ? WHITE : BLACK;
}

var sign = function (player) {
  return player == WHITE ? 1 : -1;
}

var getSteps = function (from_point, to_point) {
  return SIGN_MAP[currentPlayer] * (to_point - from_point);
}

var getPlayerAtPoint = function (point) {
  if ( getPiecesAtPoint(point) ) {
    return getPiecesAtPoint(point)[0];
  }
  return '';
}

var getPiecesAtPoint = function (point) {
    return currentPosition[point];
}

var hasPieceOut = function (player) {
  return getPiecesAtPoint(OUT_MAP[player]).length > 0;
}

var hasPieceBefore = function (player, point) {
  var start_pos = OUT_MAP[player];
  for (var i=start_pos; sign(player)*i < sign(player)*point; i+=sign(player)*1) {
    if (getPlayerAtPoint(i) == player) {
      return true;
    }
  }
  return false;
}

var getRandomDiceThrow = function() {
  return 1+Math.floor(Math.random()*6)
}

var winner = function () {
  if (getPiecesAtPoint(HOME_STORAGE_MAP[WHITE]).length == 15) {
    return WHITE;
  }
  if (getPiecesAtPoint(HOME_STORAGE_MAP[BLACK]).length == 15) {
    return BLACK;
  }
  return '';
}

var autoMove = function () {
  // sort remainingDices descending
  remainingDices = remainingDices.sort(function(a, b){return b-a;});
  var new_point;
  for (var i=0; i < remainingDices.length; i++) {
    new_point = selectedPoint + SIGN_MAP[currentPlayer] * remainingDices[i];
    if (isValidMove(selectedPoint, new_point)) {
      return new_point;
    }
  }
}

var canSelectPoint = function (point) {
  return getPlayerAtPoint(point) == currentPlayer &&
       (!hasPieceOut(currentPlayer) || point == OUT_MAP[currentPlayer]);
}

var isGameOver = function () {
  return winner() != '';
}

var selectPoint = function (point) {
  selectedPoint = point;
  redraw();
}

var inEndGame = function(player) {
  //TODO define endGame
  if ( currentPlayer == WHITE ) {
    return !hasPieceBefore(WHITE, 19);
  } else if ( currentPlayer == BLACK ) {
    return !hasPieceBefore(BLACK, 6);
  }
}

//------------------------------------------------------------------------------
// Conversion functions
//------------------------------------------------------------------------------

var coordinatesToPoint = function (x, y) {
  // Point 13-24
  if (y > conf.border && y <= conf.border + arrowHeight) {
    // Point 13-18
    if (x > conf.border && x <= conf.border + halfBoardWidth) {
      return 13 + Math.floor((x - conf.border)/arrowWidth);
    // Point 19-24
    } else if (x > conf.border * 3 + halfBoardWidth && x < containerWidth - conf.border) {
      return 19 + Math.floor((x - conf.border * 3 - halfBoardWidth)/arrowWidth);
    }
  }
  // Point 1-12
  if (y > containerHeight - conf.border - arrowHeight && y < containerHeight - conf.border) {
    // Point 7-12
    if (x > conf.border && x <= conf.border + halfBoardWidth) {
      return 12 - Math.floor((x - conf.border)/arrowWidth);
    // Point 1-6
    } else if (x > conf.border * 3 + halfBoardWidth && x < containerWidth - conf.border) {
      return 6 - Math.floor((x - conf.border * 3 - halfBoardWidth)/arrowWidth);
    }
  }
  
  // Outpieces
  if ( hasPieceOut(currentPlayer) && x > conf.border + halfBoardWidth && x < conf.border * 3 + halfBoardWidth) {
    return OUT_MAP[currentPlayer];
  }
  
  return undefined;
}

// Convert a point 1-24 to x and y coordinates, offset means adding pieces
var pointToCoordinates = function (point, offset) {
  offset = offset || 0;  

  var orientation_sign = 1;
  var x,
      y;
  if (point <= 12) {
    var start_x = containerWidth - conf.border - arrowWidth,
        start_y = containerHeight - conf.border;
    x = start_x - (point - 1) * arrowWidth;
    y = start_y;
    if (point > 6) {
      x -= conf.border * 2;
    }
  } else {
    var start_x = conf.border,
        start_y = conf.border;
    orientation_sign = -1;
    x = start_x + (point - 13) * arrowWidth;
    y = conf.border;
    if (point > 18) {
      x += conf.border * 2;
    }
  }
  // Add offset
  y -= orientation_sign * offset * pieceRadius*2;
  
  // Offset x and y to return center positions
  x += arrowWidth/2;
  y -= orientation_sign * arrowWidth/2;
  
  return [x, y];
}

//------------------------------------------------------------------------------
// Controller functions
//------------------------------------------------------------------------------

var isPushingRoll = function(x, y) {
  if (x >= ROLL_BUTTON_X && x <= ROLL_BUTTON_X + ROLL_BUTTON_WIDTH &&
      y >= ROLL_BUTTON_Y && y <= ROLL_BUTTON_Y + ROLL_BUTTON_HEIGHT) {
        return true;
  }
  return false;
}

var onMouseClick = function (ev) {
  var x = ev.clientX - canvas.offsetLeft,
      y = ev.clientY - canvas.offsetTop;
  if (gameState == STATES.MOVING) {
    var point = coordinatesToPoint(x, y);
    if (point != undefined) {
      pointClicked(point);  
    }
  } else if (gameState == STATES.THROWING_DICE) {
      diceRollPressed();
  } else if (isPushingRoll(x, y)) {
    diceRollPressed();
  }
  redraw();
}

var diceRollPressed = function() {
  if (gameState === STATES.CHOOSE_STARTER) {
    var value = getRandomDiceThrow();
    // White has thrown
    if (currentDiceRoll.length == 0) {
      currentDiceRoll.push(value);
      remainingDices.push(value);
    // Black has thrown
    } else {
      if (value == currentDiceRoll[0]) {
        alert('you hit the same redo');
        currentDiceRoll = [];
        remainingDices = [];
      } else {

        currentDiceRoll.push(value);
        remainingDices = deepCopy(currentDiceRoll);
        gameState = STATES.MOVING;
        // Black won
        if (value > currentDiceRoll[0]) {
          currentPlayer = BLACK;
          console.log('black won, black starts');
        } else {
          currentPlayer = WHITE;
          console.log('white won, white starts');
        }
      }
    }
  } else if (gameState == STATES.THROWING_DICE) {
    var dice1 = getRandomDiceThrow(),
        dice2 = getRandomDiceThrow();
    currentDiceRoll.push(dice1);
    currentDiceRoll.push(dice2);
    if ( dice1 == dice2 ) {
      currentDiceRoll.push(dice1);
      currentDiceRoll.push(dice2);
    }
    remainingDices = deepCopy(currentDiceRoll);
    console.log('dice throw', currentDiceRoll);
    gameState = STATES.MOVING;
    
    // If player can't move
    if (!canMove(currentPlayer)) {
      console.log('cant move switch player');
      currentDiceRoll = [];
      remainingDices = [];
      gameState = STATES.THROWING_DICE;
      currentPlayer = swap(currentPlayer);
    }
  }
  redraw();
}

var pointClicked = function (point) {
  // Point is already selected, move
  if (selectedPoint != undefined) {
    
    // Double click, select longest dice move as to
    if ( selectedPoint == point ) {
      point = autoMove();
    }
    
    // valid move, move
    if (move(selectedPoint, point)) {
      
      var steps = getSteps(selectedPoint, point);
      remainingDices.splice(remainingDices.indexOf(steps), 1);
      
      // Have one more move to make
      if (remainingDices.length == 0) {          
        console.log(currentPlayer, ' is done switching');
        currentPlayer = swap(currentPlayer);
        currentDiceRoll = [];
        gameState = STATES.THROWING_DICE;
      }
      stateChanged();
    }
    
    selectPoint(undefined);

  // Select point
  } else if (canSelectPoint(point)){
      selectPoint(point);
  }
  
  if (isGameOver()) {
    alert('Congratulations ' + VANITY_MAP[winner()] + ' won the game!');
  }
}

//------------------------------------------------------------------------------
// Drawing functions
//------------------------------------------------------------------------------

var drawExtras = function () {
  if ( currentPlayer == WHITE ) {
    
  }
}

var drawRollButton = function() {
  if ( gameState == STATES.CHOOSE_STARTER || gameState == STATES.THROWING_DICE) {
    context.beginPath();
    context.rect(ROLL_BUTTON_X, ROLL_BUTTON_Y, ROLL_BUTTON_WIDTH, ROLL_BUTTON_HEIGHT);
    context.fillStyle = 'white';
    context.fill();
  }
}

var drawDiceThrow = function() {
  function showDice(context, xPos, yPos, size, value) {
    var dotMap = {
      1: [[0.5, 0.5]],
      2: [[0.2, 0.8],[0.8, 0.2]],
      3: [[0.2, 0.8],[0.8, 0.2],[0.5, 0.5]],
      4: [[0.2, 0.8],[0.8, 0.2],[0.2, 0.2],[0.8, 0.8]],
      5: [[0.2, 0.8],[0.8, 0.2],[0.2, 0.2],[0.8, 0.8],[0.5, 0.5]],
      6: [[0.2, 0.8],[0.8, 0.2],[0.2, 0.2],[0.8, 0.8],[0.5, 0.2],[0.5, 0.8]],      
    }
    context.beginPath();
    context.rect(xPos, yPos, size, size);
    context.fillStyle = 'white';
    context.lineStyle = 'black';
    context.lineWidth = 1;
    context.fill();
    context.stroke();
    for (var i=0; i<dotMap[value].length; i++) {
      context.beginPath();
      context.arc(xPos + dotMap[value][i][0] * size, yPos + dotMap[value][i][1] * size, size/10, 0, 2*Math.PI);
      context.fillStyle = 'black';
      context.fill();
    }
  }
  var y = halfBoardHeight/2,
      x = 3.5 * conf.border + halfBoardWidth;
  for (var i=0; i < remainingDices.length; i++) {
    showDice(context, x, y, 30, remainingDices[i]);
    x += 35;
  }
}
var _drawPiece = function (x, y, player, selected) {
  context.beginPath();
  context.arc(x, y, pieceRadius, 0, 2 * Math.PI, false);
  context.fillStyle = conf.colorMap[player];
  context.strokeStyle = 'black';
  context.lineWidth = 1;
  // If point is selected and this is the top piece, highlight
  if (selected) {
    context.strokeStyle = 'yellow';
    context.lineWidth = 5;
  }
  context.stroke();
  context.fill();
}

// TODO Refactor this into one big loop
var drawPieces = function () {
  
  // Draw ingame pieces
  for (var point=1; point <= 24; point++) {
    for (var offset=0; offset < currentPosition[point].length; offset++) {
      var x_y = pointToCoordinates(point, offset);
      var color = conf.colorMap[getPlayerAtPoint(point)];
      var isSelected = point == selectedPoint && offset == getPiecesAtPoint(point).length - 1;
      _drawPiece(x_y[0], x_y[1], getPlayerAtPoint(point), isSelected);
    }
  }
  
  // Draw out pieces
  var outXPos = conf.border * 2 + halfBoardWidth;

  var whiteOuts = getPiecesAtPoint(OUT_MAP[WHITE]).replace(BLACK, '');
  for ( var i=0; i < whiteOuts.length; i++ ) {
    var isSelected = OUT_MAP[WHITE] == selectedPoint && i == getPiecesAtPoint(OUT_MAP[WHITE]).length - 1;
    console.log('out is selected', isSelected, i, getPiecesAtPoint(point).length - 1)
    _drawPiece(outXPos, conf.border + halfBoardHeight * 3/4 + i * 30, WHITE, isSelected);
  }
  
  var blackOuts = getPiecesAtPoint(OUT_MAP[BLACK]).replace(WHITE, '');
  for ( var i=0; i < blackOuts.length; i++ ) {
    var isSelected = OUT_MAP[BLACK] == selectedPoint && i == getPiecesAtPoint(OUT_MAP[BLACK]).length - 1;
    _drawPiece(outXPos, halfBoardHeight * 1/4 + i * 30, BLACK, isSelected);
  }
  
  // Draw home pieces
  var homeXPos = conf.border * 3.5 + halfBoardWidth * 2;
  
  var whiteHomes = getPiecesAtPoint(HOME_STORAGE_MAP[WHITE]);
  for ( var i=0; i < whiteHomes.length; i++ ) {
    _drawPiece(homeXPos, conf.border * 1.5  + i * 10, WHITE);
  }
  
  var blackHomes = getPiecesAtPoint(HOME_STORAGE_MAP[BLACK]);
  for ( var i=0; i < blackHomes.length; i++ ) {
    _drawPiece(homeXPos, halfBoardHeight + conf.border * 0.5  - i * 10, BLACK);
  }
};

var drawBoard = function () {
  // Draw background
  //context.rotate(90*Math.PI/180);
  //context.translate(0,-containerHeight)
  context.beginPath();
  context.rect(0, 0, containerWidth, containerHeight);
  context.fillStyle = conf.boardBorderColor;
  context.fill();
  
  // Carve out two holes

  context.beginPath();
  context.rect(conf.border, conf.border, halfBoardWidth, halfBoardHeight);
  context.fillStyle = conf.boardColor;
  context.fill();
  
  context.beginPath();
  context.rect(conf.border * 3 + halfBoardWidth, conf.border, halfBoardWidth, halfBoardHeight);
  context.fillStyle = conf.boardColor;
  context.fill();
  
  // Draw the arrows
  var xPos = conf.border,
      yPos = conf.border;
  function drawArrows (xPos, yPos, orientation) {
    var arrow_tip_pos = arrowHeight,
        color_offset = 0;
    if (orientation === 'up') {
      arrow_tip_pos = -arrowHeight;
      color_offset = 1;
    }
    for (var i=0; i < 12; i++) {
      context.beginPath();
      context.moveTo(xPos, yPos);
      context.lineTo(xPos + arrowWidth/2, yPos + arrow_tip_pos);
      context.lineTo(xPos + arrowWidth, yPos);
      context.lineTo(xPos, yPos);
      context.fillStyle = (i + color_offset) % 2 == 0 ? conf.lightColor : conf.darkColor;
      context.fill();

      xPos += arrowWidth;
      if (i == 5) {
        xPos += conf.border * 2;
      };
    };    
  }
  drawArrows(conf.border, conf.border, 'down');
  drawArrows(conf.border, conf.border+halfBoardHeight, 'up');
};

var redraw = function() {
  drawBoard();
  drawPieces();
  drawRollButton();
  drawDiceThrow();
  drawExtras();
}

//------------------------------------------------------------------------------
// Init functions
//------------------------------------------------------------------------------

var init = function () {
  loadConfig();
  
  canvas = document.getElementById(canvasId);
  context = canvas.getContext('2d');
  
  initDimensions();
  initListeners();
  drawBoard();
  drawPieces();
  
  startGame();
};

var initListeners = function () {
  canvas.addEventListener('click', onMouseClick, false);
}

var initDimensions = function () {
  // set sizes
  containerWidth = canvas.offsetWidth;
  containerHeight = canvas.offsetHeight;
  halfBoardWidth = (containerWidth - conf.border * 4)/2;
  halfBoardHeight = containerHeight - conf.border * 2;
  arrowWidth = halfBoardWidth/6;
  arrowHeight = halfBoardHeight*0.8/2;
  pieceRadius = arrowWidth/2.4;
  ROLL_BUTTON_X = conf.border * 4;
  ROLL_BUTTON_Y = halfBoardHeight/2;
  ROLL_BUTTON_HEIGHT = 30;
  ROLL_BUTTON_WIDTH = 50;
};

var loadConfig = function () {
  if (conf.hasOwnProperty('border') !== true) {
    conf.border = 20
  };
  if (conf.hasOwnProperty('boardColor') !== true) {
    conf.boardColor = "#00843f"
  }
  conf.boardBorderColor = "#5C3317";
  conf.lightColor = "#fff";
  conf.darkColor = "#000";
  conf.colorMap = {'w':"#ffffff",'b':"#990000"};
};

var startGame = function() {
  console.log('starting game');
  gameState = STATES.CHOOSE_STARTER;
  redraw();
}


//------------------------------------------------------------------------------
// Expose public functions
//------------------------------------------------------------------------------

widget.saveState = saveState;
widget.loadState = loadState;
widget.undo = undo;
widget.hasPieceBefore = hasPieceBefore;

//------------------------------------------------------------------------------
// Run init and return exposed object
//------------------------------------------------------------------------------

init();

return widget;

}; //end window.BackGammon

})();
;(function() {
'use strict';

window['BackGammonBoard'] = window['BackGammonBoard'] || function(board) {
  
// CONSTANTS
var BLACK = 'b',
    WHITE = 'w',
    START_POSITION=['','ww','','','','','bbbbb',
                    '','bbb','','','','wwwww',
                    'bbbbb','','','','www','',
                    'wwwww','','','','','bb','', '', '', '', '', '', '', '', '', ''], // 1-indexed
    HOME_MAP = {'w': 25, 'b': 0},
    OUT_MAP = {'w': 0, 'b': 25},
    HOME_STORAGE_MAP = {'w': 33, 'b': 34},
    SIGN_MAP = {'b': -1, 'w': 1};
    
// State
board = board || START_POSITION;

// transaction

var transactions = [];
var transactionId = -1;

//------------------------------------------------------------------------------
// Util functions
//------------------------------------------------------------------------------

var deepCopy = function (obj) {
  return JSON.parse(JSON.stringify(obj));
}

var swap = function (player) {
  return player == BLACK ? WHITE : BLACK;
}

var sign = function (player) {
  return player == WHITE ? 1 : -1;
}

var getSteps = function (from_point, to_point, player) {
  return SIGN_MAP[player] * (to_point - from_point);
}

var getPlayerAtPoint = function (point) {
  if ( getPiecesAtPoint(point) ) {
    return getPiecesAtPoint(point)[0];
  }
  return '';
}

var getPiecesAtPoint = function (point) {
    if ( point < 0 || point > board.length - 1) {
      return '';
    }
    return board[point];
}

var hasPieceOut = function (player) {
  return getNumPiecesOut(player) > 0;
}

var getNumPiecesAtPoint = function(point) {
  return getPiecesAtPoint(point).length;
}

var getNumPiecesOut = function (player) {
  return getNumPiecesAtPoint(outPos(player));
}

var hasPieceBefore = function (player, point) {
  var start_pos = outPos(player);
  for (var i=start_pos; sign(player)*i < sign(player)*point; i+=sign(player)*1) {
    if (getPlayerAtPoint(i) == player) {
      return true;
    }
  }
  return false;
}

var getPointValue = function (point, player) {
  if (player == WHITE) {
    return 25 - point;
  } else {
    return point;
  }
}

var getPlayerScore = function (player) {
  var score = 0;
  var playerPoints = getPointsWithPlayer(player);
  for (var i=0; i < playerPoints.length; i++) {
    score += getNumPiecesAtPoint(playerPoints[i]) * getPointValue(playerPoints[i], player);
  }
  return score;
}

var getPointsWithPlayer = function(player, threshold, max) {
  threshold = threshold || 0;
  max = max || 15;
  var points = [];
  for (var i=0; i < 27; i++) {
    if (getPlayerAtPoint(i) == player && getPiecesAtPoint(i).length >= threshold && getPiecesAtPoint(i).length <= max) {
      points.push(i);
    }
  }
  return points;
}

var inEndGame = function(player) {
  if ( player == WHITE ) {
    return !hasPieceBefore(WHITE, 19);
  } else if ( player == BLACK ) {
    return !hasPieceBefore(BLACK, 6);
  }
}
var getToPoint = function (player, fromPoint, diceValue) {
  return fromPoint + SIGN_MAP[player] * diceValue;
}

var outPos = function (player) {
  return OUT_MAP[player];
}

var getHomePos = function (player) {
  return HOME_STORAGE_MAP[player];
}

var numPiecesHome = function (player) {
  return getNumPiecesAtPoint(getHomePos(player));
}

var numPiecesOut = function (player) {
  return getNumPiecesAtPoint(outPos(player));
}

var copy = function () {
  return new BackGammonBoard(deepCopy(board));
}

//------------------------------------------------------------------------------
// Move functions
//------------------------------------------------------------------------------
    
// Check if there exists a possible move for player
var canMove = function (player, dices) {
  console.log('canMove', player, dices);
  // Go through each points for player
  if (hasPieceOut(player)) {
    var point = outPos(player);
    for (var i=0; i < dices.length; i++) {
      var new_point = point + SIGN_MAP[player] * dices[i];
      if (isValidMove(point, new_point, player, dices)) {
        return true;
      }
    }
  }
  else {
    for ( var point=0; point<26; point++ ) {
      if (getPlayerAtPoint(point) == player) {

        for (var i=0; i < dices.length; i++) {
          var new_point = point + SIGN_MAP[player] * dices[i];
          if (isValidMove(point, new_point, player, dices)) {
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


var isValidMove = function(from_point, to_point, player, dices) {
  // No piece at position
  if (!getPiecesAtPoint(from_point).length) {
    return false;
  }
  
  // Wrong color to move
  if ( getPlayerAtPoint(from_point) != player ) {
    return false;
  }
  
  // Has piece out
  if ( hasPieceOut(player) && from_point != outPos(player)) {
    return false;
  }
  
  // No dice corresponding to move
  var steps = getSteps(from_point, to_point, player);
  if ( dices.indexOf(steps) == -1 ) {
    return false;
  }
  
  // Is destination occupied by opponent
  if ( getPlayerAtPoint(to_point) == swap(player) &&
       board[to_point].length > 1) {
    return false;
  }
  
  // Is home point before end game
  if (!inEndGame(player) && to_point == HOME_MAP[player]) {
    return false;
  }
  
  // If point is outside
  if (to_point < 0 || to_point > 25) {
    
    // If not in endgame
    if (!inEndGame(player)) {
      return false;
    }
    
    // If has piece before
    if (hasPieceBefore(player, from_point)) {
      return false;
    }
  }
  
  return true;
}

var removePiece = function (point) {
  var piece = board[point].slice(-1);
  board[point] = board[point].slice(0, -1);
  return piece;
}

var addPiece = function(point, player) {
  board[point] += player;
}

// Move piece without checking any logic
var _movePiece = function (from_point, to_point) {
  var piece_to_move = removePiece(from_point)
  addPiece(to_point, piece_to_move);
  if (transactionId > -1) {
    transactions[transactionId].push([from_point, to_point]);
  }
}

var move = function (from_point, to_point, player) {
  var moves = getMovesWhenMoving(from_point, to_point, player);
  for (var i=0; i < moves.length; i++) {
    _movePiece(moves[i][0], moves[i][1]);
  }
  return true; 
}

var getMovesWhenMoving = function(from_point, to_point, player) {
  var moves = [];
  
  if ( getPlayerAtPoint(to_point) == swap(player) && getPiecesAtPoint(to_point).length == 1) {
    moves.push([to_point, outPos(swap(player)), swap(player)]);
  }
  
  // If player moved home (or above), move to home storage
  if (sign(player)*to_point >= sign(player)*HOME_MAP[player]) {
    moves.push([from_point, HOME_STORAGE_MAP[player], player]);
    
  // Move normal
  } else {
    moves.push([from_point, to_point, player]);
  }
  return moves;
}

var beginTransaction = function () {
  transactionId += 1;
  transactions[transactionId] = [];
}

var rollback = function () {
  for (var i=transactions[transactionId].length - 1; i>=0; i--) {
    _movePiece(transactions[transactionId][i][1], transactions[transactionId][i][0]);
  }
  transactions.splice(transactionId, 1);
  transactionId -= 1;
}


//------------------------------------------------------------------------------
// Expose public functions
//------------------------------------------------------------------------------

var return_object = {};
return_object.getSteps = getSteps;
return_object.getPlayerAtPoint = getPlayerAtPoint;
return_object.getPiecesAtPoint = getPiecesAtPoint;
return_object.getToPoint = getToPoint;
return_object.hasPieceOut = hasPieceOut;
return_object.hasPieceBefore = hasPieceBefore;
return_object.getPointsWithPlayer = getPointsWithPlayer;
return_object.getNumPiecesAtPoint = getNumPiecesAtPoint;
return_object.canMove = canMove;
return_object.isValidMove = isValidMove;
return_object.move = move;
return_object.outPos = outPos;
return_object.numPiecesHome = numPiecesHome;
return_object.copy = copy;
return_object.getPlayerScore = getPlayerScore;
return_object.rollback = rollback;
return_object.beginTransaction = beginTransaction;
return_object.getMovesWhenMoving = getMovesWhenMoving;
return_object.removePiece = removePiece;
return_object.addPiece = addPiece;
// constants
return_object.WHITE = WHITE;
return_object.BLACK = BLACK;

return_object.getBoard = function () {
  return board;
}

return return_object;


} // End window.BackGammonBoard

window['BackGammon'] = window['BackGammon'] || function(canvasId, conf) {
  
conf = conf || {}


var VANITY_MAP = {'w': 'White', 'b': 'Black'},
    STATES = {CHOOSE_STARTER: 1, MOVING: 2, THROWING_DICE: 4, ANIMATING: 8},
    EMPTY = '',
    HUMAN = 'human',
    COMPUTER = 'computer';

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
    
// listeners of changes
var stateListeners = [];

// other
var playerTypeMap,
    animationQueue = [],
    animationBoard,
    isAnimating;

// global state variables
var selectedPoint,
    currentDiceRoll = [],
    remainingDices = [],
    currentPlayer,
    gameState,
    board = new BackGammonBoard();

    
// Previous states
var previousStates = [];

//------------------------------------------------------------------------------
// State function (Load/Save/Undo)
//------------------------------------------------------------------------------

var saveState = function() {
  return JSON.stringify({
    currentPlayer: currentPlayer,
    gameState: gameState,
    board: board.getBoard(),
    currentDiceRoll: currentDiceRoll,
    remainingDices: remainingDices,
    selectedPoint: selectedPoint
  });
}

var loadState = function(state) {

  state = JSON.parse(state);
  currentPlayer = state.currentPlayer;
  gameState = state.gameState;
  board = new BackGammonBoard(state.board);
  currentDiceRoll = state.currentDiceRoll;
  remainingDices = state.remainingDices;
  selectedPoint = state.selectedPoint;
  
  redraw();
  stateChanged();
  
}

var stateChanged = function () {
  previousStates.push(saveState());
  
  // Notify listeners
  for (var i=0; i < stateListeners.length; i++) {
    setTimeout(stateListeners[i], 50);
  }
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

var registerStateListener = function (listener) {
  stateListeners.push(listener);
}

//------------------------------------------------------------------------------
// Animation functions
//------------------------------------------------------------------------------
var runAnimations = function(callback) {

  // We're already running an animation loop
  if (isAnimating) {
    return;
  }
  
  isAnimating = true;
  function runNext() {
    if (animationQueue.length == 0) {
      animationBoard = undefined;
      isAnimating = false;
      redraw();
    } else {
      var animation = animationQueue.slice(0, 1)[0];
      animationBoard = animation.board;
      animationQueue = animationQueue.slice(1);
      animatePiece(animation.from, animation.to, animation.player, animation.selected, runNext);
    }
  }
  runNext();
}

var animatePiece = function(from, to, player, selected, callback) {
  var msLength = 1000;
  var frameRate = 30;
  
  var numSteps = msLength/frameRate;
  
  var step = 0;
  var deltaX = (to[0] - from[0])/numSteps;
  var deltaY = (to[1] - from[1])/numSteps;
  
  function animateStep() {
    var x = from[0] + step * deltaX,
        y = from[1] + step * deltaY;
    redraw();
    _drawPiece(x, y, player, selected);

    // Done call finish
    if (step >= numSteps) {
      callback();
    } else {
      step += 1;
      setTimeout(animateStep, frameRate);
    }
  }
  animateStep(step);
}

var createAnimations = function (_board, moves, player) {
  // Add to animation queue
  for (var i=0; i < moves.length; i++) {
    var from = moves[i][0],
        to = moves[i][1],
        _player = moves[i][2];
    var startPos = pointToCoordinates(from, _board.getNumPiecesAtPoint(from) -1),
        endPos = pointToCoordinates(to, _board.getNumPiecesAtPoint(to));
    _board.removePiece(from);
    animationQueue.push({
      board: _board.copy(),
      from: startPos,
      to: endPos,
      player: _player,
      selected: _player == player
    });
    _board.move(from, to, _player);
  }
  runAnimations();
}


//------------------------------------------------------------------------------
// Util functions
//------------------------------------------------------------------------------

var deepCopy = function (obj) {
  return JSON.parse(JSON.stringify(obj));
}

var swap = function (currentPlayer) {
  return currentPlayer == board.BLACK ? board.WHITE : board.BLACK;
}

var getPlayerType = function (player) {
  return playerTypeMap[player];
}

var getRandomDiceThrow = function() {
  return 1+Math.floor(Math.random()*6)
}

var winner = function () {
  if (board.numPiecesHome(board.WHITE) == 15) {
    return board.WHITE;
  }
  if (board.numPiecesHome(board.BLACK) == 15) {
    return board.BLACK;
  }
  return '';
}

var resetDices = function () {
  remainingDices = [];
  currentDiceRoll = [];
}

var autoMove = function () {
  // sort remainingDices descending
  remainingDices = remainingDices.sort(function(a, b){return b-a;});
  var new_point;
  for (var i=0; i < remainingDices.length; i++) {
    new_point = board.getToPoint(currentPlayer, selectedPoint, remainingDices[i]);
    if (board.isValidMove(selectedPoint, new_point, currentPlayer, remainingDices)) {
      return new_point;
    }
  }
}

var canSelectPoint = function (point) {
  return board.getPlayerAtPoint(point) == currentPlayer &&
       (!board.hasPieceOut(currentPlayer) || point == board.outPos(currentPlayer));
}

var isGameOver = function () {
  return winner() != '';
}

var selectPoint = function (point) {
  selectedPoint = point;
}

var useDice = function(diceValue) {
  console.log('use dice', diceValue, remainingDices, remainingDices.indexOf(diceValue));
  remainingDices.splice(remainingDices.indexOf(diceValue), 1);
  console.log('after', remainingDices);
}

var switchPlayer = function() {
  resetDices();
  selectPoint(undefined);
  gameState = STATES.THROWING_DICE;
  currentPlayer = swap(currentPlayer);
  console.log('currentPlayer:', currentPlayer);
  stateChanged();
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
  if ( board.hasPieceOut(currentPlayer) && x > conf.border + halfBoardWidth && x < conf.border * 3 + halfBoardWidth) {
    return board.outPos(currentPlayer);
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
  
  // Ignore click if current player isnt human
  if (getPlayerType(currentPlayer) != HUMAN) {
    console.log('ignoring click', currentPlayer, getPlayerType(currentPlayer), playerTypeMap);
    return;
  }
  
  // Get mouse x and y pos
  var x = ev.clientX - canvas.offsetLeft,
      y = ev.clientY - canvas.offsetTop;
  
  if (gameState == STATES.MOVING) {
    var point = coordinatesToPoint(x, y);
    if (point != undefined) {
      pointClicked(point);  
    }
  } else if (isPushingRoll(x, y) && (gameState == STATES.THROWING_DICE || gameState == STATES.CHOOSE_STARTER)) {
    throwDice();
  }
}

var throwDice = function() {
  if (gameState === STATES.CHOOSE_STARTER) {
    var value = getRandomDiceThrow();
    // White has thrown
    if (currentPlayer == board.WHITE) {
      currentDiceRoll.push(value);
      remainingDices.push(value);
      currentPlayer = swap(currentPlayer);
    // Black has thrown
    } else {
      if (value == currentDiceRoll[0]) {
        alert('you hit the same redo');
        currentDiceRoll = [];
        remainingDices = [];
        currentPlayer = board.WHITE;
      } else {

        currentDiceRoll.push(value);
        remainingDices = deepCopy(currentDiceRoll);
        gameState = STATES.MOVING;
        // Black won
        if (value > currentDiceRoll[0]) {
          currentPlayer = board.BLACK;
          console.log('black won, black starts');
        } else {
          currentPlayer = board.WHITE;
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
    if (!board.canMove(currentPlayer, remainingDices)) {
      console.log('cant move switch player');
      switchPlayer();
    }
  }
  redraw();  
  stateChanged();
}

var applyMoves = function(moves) {
  for (var i=0; i < moves.length; i++) {
    move(moves[i][0], moves[i][1], currentPlayer);
  }
}
var _move = function (fromPoint, toPoint, player) {
  board.move(fromPoint, toPoint, player);
  var steps = board.getSteps(fromPoint, toPoint, player);
  useDice(steps);
  // Check if turn is done
  if (remainingDices.length == 0) {          
    console.log(player, ' is done switching');
    switchPlayer();
  } else {
    if ( !board.canMove(currentPlayer, remainingDices) ) {
      switchPlayer();
    }
  }
}
var move = function(fromPoint, toPoint, player) {  
  // Store a copy of original state
  var boardBeforeMove = board.copy();

  // Do the actual move
  _move(fromPoint, toPoint, player);
  
  // First get all moves that will be done by performing this move
  var allMoves = boardBeforeMove.getMovesWhenMoving(fromPoint, toPoint, player);
  createAnimations(boardBeforeMove, allMoves, player);
}



var pointClicked = function (point) {
  // Point is already selected, move
  if (selectedPoint != undefined) {
    
    // Double click, select longest dice move as to
    if ( selectedPoint == point ) {
      point = autoMove();
    }
    
    // valid move, move
    if (board.isValidMove(selectedPoint, point, currentPlayer, remainingDices)) {
      move(selectedPoint, point, currentPlayer);
    }
    selectPoint(undefined);
  // Select point
  } else if (canSelectPoint(point)){
      selectPoint(point);
      redraw();
  }
  
  if (isGameOver()) {
    alert('Congratulations ' + VANITY_MAP[winner()] + ' won the game!');
  }
}

//------------------------------------------------------------------------------
// Drawing functions
//------------------------------------------------------------------------------
var curBoard = function () {
  if (animationBoard) {
    return animationBoard;
  }
  return board;
}

var drawExtras = function () {

  [board.WHITE, board.BLACK].forEach(function (player){
    var xPos = 20;
    var yPos = 10;
    if ( player == board.WHITE ) {
      yPos = conf.border * 1.5 + halfBoardHeight;
    }
    context.beginPath();
    context.fillStyle = 'white';
    context.fillText('Score: ' + curBoard().getPlayerScore(player), xPos, yPos);
  })

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
    for (var offset=0; offset < curBoard().getBoard()[point].length; offset++) {
      var x_y = pointToCoordinates(point, offset);
      var color = conf.colorMap[curBoard().getPlayerAtPoint(point)];
      var isSelected = point == selectedPoint && offset == curBoard().getPiecesAtPoint(point).length - 1;
      _drawPiece(x_y[0], x_y[1], curBoard().getPlayerAtPoint(point), isSelected);
    }
  }
  
  // Draw out pieces
  var outXPos = conf.border * 2 + halfBoardWidth;

  var whiteOuts = curBoard().getPiecesAtPoint(curBoard().outPos(board.WHITE)).replace(board.BLACK, '');
  for ( var i=0; i < whiteOuts.length; i++ ) {
    var isSelected = curBoard().outPos(board.WHITE) == selectedPoint && i == curBoard().getPiecesAtPoint(curBoard().outPos(board.WHITE)).length - 1;
    _drawPiece(outXPos, conf.border + halfBoardHeight * 3/4 + i * 30, board.WHITE, isSelected);
  }
  
  var blackOuts = curBoard().getPiecesAtPoint(curBoard().outPos(board.BLACK)).replace(board.WHITE, '');
  for ( var i=0; i < blackOuts.length; i++ ) {
    var isSelected = curBoard().outPos(board.BLACK) == selectedPoint && i == board.getPiecesAtPoint(curBoard().outPos(board.BLACK)).length - 1;
    _drawPiece(outXPos, halfBoardHeight * 1/4 + i * 30, board.BLACK, isSelected);
  }
  
  // Draw home pieces
  var homeXPos = conf.border * 3.5 + halfBoardWidth * 2;
  
  for ( var i=0; i < curBoard().numPiecesHome(board.WHITE); i++ ) {
    _drawPiece(homeXPos, conf.border * 1.5  + i * 10, board.WHITE);
  }
  
  for ( var i=0; i < curBoard().numPiecesHome(board.BLACK); i++ ) {
    _drawPiece(homeXPos, halfBoardHeight + conf.border * 0.5  - i * 10, board.BLACK);
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
  initMisc();
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

var initMisc = function () {
  playerTypeMap = conf.playerTypeMap;
  console.log('playertypemap',playerTypeMap);
}

var loadConfig = function () {
  console.log('conf', conf);
  if (conf.hasOwnProperty('border') !== true) {
    conf.border = 20
  };
  if (conf.hasOwnProperty('boardColor') !== true) {
    conf.boardColor = "#00843f"
  }
  if (conf.hasOwnProperty('playerTypeMap') !== true) {
      conf.playerTypeMap = {};
      conf.playerTypeMap[board.BLACK] = HUMAN;
      conf.playerTypeMap[board.WHITE] = HUMAN;
  }
  conf.boardBorderColor = "#5C3317";
  conf.lightColor = "#fff";
  conf.darkColor = "#000";
  conf.colorMap = {'w':"#ffffff",'b':"#990000"};

};

var startGame = function() {
  console.log('starting game');
  gameState = STATES.CHOOSE_STARTER;
  currentPlayer = board.WHITE;
  redraw();
}


//------------------------------------------------------------------------------
// Expose public functions
//------------------------------------------------------------------------------

widget.saveState = saveState;
widget.loadState = loadState;
widget.undo = undo;
widget.throwDice = throwDice;
widget.registerStateListener = registerStateListener;
widget.swap = swap;
widget.applyMoves = applyMoves;
widget.animatePiece = animatePiece;


widget.getGameState = function () {
  return gameState;
}

widget.getCurrentPlayer = function () {
  return currentPlayer;
}

widget.getRemainingDices = function () {
  return remainingDices;
}

widget.getBoard = function () {
  return board;
}

//Constants
widget.WHITE = board.WHITE;
widget.BLACK = board.BLACK;
widget.STATES = STATES;

//------------------------------------------------------------------------------
// Run init and return exposed object
//------------------------------------------------------------------------------

init();

return widget;

}; //end window.BackGammon

})();